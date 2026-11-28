import json
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy.orm import Session

from app.models.auth import User
from app.models.customer import Customer
from app.models.sync_mirrors import ExternalIdMapping

SOURCE_SCHEDULER = "designer_task_scheduler"
SOURCE_QUOTATIONS = "quotation_management"

SENSITIVE_PII_KEYS = frozenset(
    {
        "password",
        "hashed_password",
        "token",
        "access_token",
        "refresh_token",
        "bank_name",
        "bank_account_no",
        "bank_ifsc",
        "aadhaar_no",
        "pan_no",
        "passport_no",
        "salary_ctc",
        "last_login_ip",
        "last_device",
        "dob",
        "address",
    }
)


def scrub_sensitive_payload(data: Any) -> Any:
    """Recursively remove any sensitive PII or credential keys before storing JSON snapshots."""
    if isinstance(data, dict):
        return {
            k: scrub_sensitive_payload(v)
            for k, v in data.items()
            if str(k).lower() not in SENSITIVE_PII_KEYS
        }
    if isinstance(data, list):
        return [scrub_sensitive_payload(item) for item in data]
    return data


def parse_json_value(val: Any) -> Any:
    if isinstance(val, str):
        stripped = val.strip()
        if stripped.startswith("{") or stripped.startswith("["):
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                return val
    return val


def parse_bool(val: Any, default: bool = False) -> bool:
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        return val.strip().lower() in {"1", "true", "yes", "y", "t"}
    return default


def parse_int(val: Any, default: int | None = None) -> int | None:
    if val is None or val == "":
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def parse_decimal(val: Any) -> Decimal | None:
    if val is None or val == "":
        return None
    try:
        return Decimal(str(val))
    except (InvalidOperation, ValueError, TypeError):
        return None


def parse_date(val: Any) -> date | None:
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        txt = val.strip()
        try:
            if "T" in txt:
                return datetime.fromisoformat(txt.replace("Z", "+00:00")).date()
            return date.fromisoformat(txt[:10])
        except ValueError:
            return None
    return None


def parse_datetime(val: Any) -> datetime | None:
    if val is None or val == "":
        return None
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str):
        txt = val.strip()
        try:
            dt = datetime.fromisoformat(txt.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            try:
                d = date.fromisoformat(txt[:10])
                return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
            except ValueError:
                return None
    return None


def extract_selected_quotation_option(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Preserve Quotation Management option selection and tax/total values verbatim.
    Never recalculates rates, GST, or rounding inside Avora.
    """
    raw_options = parse_json_value(payload.get("options"))
    raw_line_items = parse_json_value(payload.get("quotation_line_items"))
    raw_products = parse_json_value(payload.get("products"))

    active_idx = parse_int(payload.get("active_option_index"), 0) or 0
    selected_opt: dict[str, Any] | None = None
    selected_label: str | None = None
    include_tax: bool | None = None
    selected_items: Any = None
    option_tax_percent = parse_decimal(payload.get("tax_percent"))
    option_tax_amount = parse_decimal(payload.get("tax_amount"))

    if isinstance(raw_options, list) and len(raw_options) > 0:
        if active_idx < 0 or active_idx >= len(raw_options):
            active_idx = 0
        candidate = raw_options[active_idx]
        if isinstance(candidate, dict):
            selected_opt = candidate
            selected_label = (
                candidate.get("name")
                or candidate.get("label")
                or candidate.get("option_name")
                or f"Option {active_idx + 1}"
            )
            if "include_tax" in candidate and candidate.get("include_tax") is not None:
                include_tax = parse_bool(candidate.get("include_tax"))
            if candidate.get("gst_percent") is not None:
                option_tax_percent = parse_decimal(candidate.get("gst_percent"))
            elif candidate.get("tax_percent") is not None:
                option_tax_percent = parse_decimal(candidate.get("tax_percent"))

            if candidate.get("gst_amount") is not None:
                option_tax_amount = parse_decimal(candidate.get("gst_amount"))
            elif candidate.get("tax_amount") is not None:
                option_tax_amount = parse_decimal(candidate.get("tax_amount"))

            selected_items = (
                candidate.get("products")
                or candidate.get("line_items")
                or candidate.get("items")
            )

    if selected_items is None:
        selected_items = raw_line_items if raw_line_items is not None else raw_products

    if include_tax is None and option_tax_amount is not None:
        include_tax = option_tax_amount > Decimal("0")

    return {
        "active_option_index": active_idx,
        "selected_option_label": selected_label,
        "include_tax": include_tax,
        "source_tax_percent": option_tax_percent,
        "source_tax_amount": option_tax_amount,
        "source_rounded_total": parse_decimal(payload.get("rounded_total")),
        "source_grand_total": parse_decimal(payload.get("grand_total")),
        "selected_option_items": scrub_sensitive_payload(selected_items),
        "all_options_snapshot": scrub_sensitive_payload(raw_options),
        "line_items_snapshot": scrub_sensitive_payload(raw_line_items),
        "selected_opt": selected_opt,
    }


def resolve_user_mapping(
    db: Session,
    source_system: str,
    source_table: str,
    source_pk: str,
    email: str | None,
    source_label: str | None,
) -> tuple[Any, str]:
    """
    Resolve an external staff user to a native Avora User UUID strictly by explicit manual mapping
    or exact unique email. Missing emails & ambiguous matches remain unlinked and reviewable.
    """
    mapping = (
        db.query(ExternalIdMapping)
        .filter(
            ExternalIdMapping.source_system == source_system,
            ExternalIdMapping.source_table == source_table,
            ExternalIdMapping.source_pk == source_pk,
        )
        .first()
    )

    if mapping and mapping.match_status == "matched_manual" and mapping.avora_entity_id:
        mapping.source_label = source_label or mapping.source_label
        return mapping.avora_entity_id, "matched_manual"

    if not mapping:
        mapping = ExternalIdMapping(
            source_system=source_system,
            source_table=source_table,
            source_pk=source_pk,
            avora_entity_type="user",
        )
        db.add(mapping)

    mapping.avora_entity_type = "user"
    mapping.source_label = source_label

    clean_email = (email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        mapping.avora_entity_id = None
        mapping.match_status = "missing_email"
        mapping.match_reason = "Source user record has missing or invalid email; review manually."
        mapping.candidate_ids = None
        return None, "missing_email"

    matches = (
        db.query(User.id)
        .filter(User.email.ilike(clean_email))
        .all()
    )
    if len(matches) == 1:
        matched_id = matches[0][0]
        mapping.avora_entity_id = matched_id
        mapping.match_status = "matched_auto"
        mapping.match_reason = f"Exact unique email match ({clean_email})."
        mapping.candidate_ids = None
        return matched_id, "matched_auto"

    if len(matches) > 1:
        mapping.avora_entity_id = None
        mapping.match_status = "ambiguous"
        mapping.match_reason = f"Multiple Avora users share email {clean_email}."
        mapping.candidate_ids = [str(m[0]) for m in matches]
        return None, "ambiguous"

    mapping.avora_entity_id = None
    mapping.match_status = "unmapped"
    mapping.match_reason = f"No Avora user found with email {clean_email}."
    mapping.candidate_ids = None
    return None, "unmapped"


def resolve_customer_mapping(
    db: Session,
    source_system: str,
    source_table: str,
    source_pk: str,
    client_email: str | None,
    client_name: str | None,
) -> tuple[Any, str]:
    """
    Never auto-merge customers by name alone. Link automatically ONLY by exact unique email match,
    or preserve manual admin override in ExternalIdMapping. Everything else stays reviewable.
    """
    mapping = (
        db.query(ExternalIdMapping)
        .filter(
            ExternalIdMapping.source_system == source_system,
            ExternalIdMapping.source_table == source_table,
            ExternalIdMapping.source_pk == source_pk,
        )
        .first()
    )

    if mapping and mapping.match_status == "matched_manual" and mapping.avora_entity_id:
        mapping.source_label = client_name or mapping.source_label
        return mapping.avora_entity_id, "matched_manual"

    if not mapping:
        mapping = ExternalIdMapping(
            source_system=source_system,
            source_table=source_table,
            source_pk=source_pk,
            avora_entity_type="customer",
        )
        db.add(mapping)

    mapping.avora_entity_type = "customer"
    mapping.source_label = client_name

    clean_email = (client_email or "").strip().lower()
    if not clean_email or "@" not in clean_email:
        mapping.avora_entity_id = None
        mapping.match_status = "missing_email"
        mapping.match_reason = "No client_email on source record; never auto-merged by name."
        mapping.candidate_ids = None
        return None, "missing_email"

    matches = (
        db.query(Customer.id)
        .filter(Customer.is_deleted.is_(False), Customer.email.ilike(clean_email))
        .all()
    )
    if len(matches) == 1:
        matched_id = matches[0][0]
        mapping.avora_entity_id = matched_id
        mapping.match_status = "matched_auto"
        mapping.match_reason = f"Exact unique customer email match ({clean_email})."
        mapping.candidate_ids = None
        return matched_id, "matched_auto"

    if len(matches) > 1:
        mapping.avora_entity_id = None
        mapping.match_status = "ambiguous"
        mapping.match_reason = f"Multiple Avora customers match email {clean_email}."
        mapping.candidate_ids = [str(m[0]) for m in matches]
        return None, "ambiguous"

    mapping.avora_entity_id = None
    mapping.match_status = "unmapped"
    mapping.match_reason = f"No Avora customer found with email {clean_email}; kept unmapped for review."
    mapping.candidate_ids = None
    return None, "unmapped"
