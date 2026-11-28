import argparse
import json
import logging

from app.sync.config import get_sync_config
from app.sync.mapper import SOURCE_QUOTATIONS, SOURCE_SCHEDULER
from app.sync.worker import SyncWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Avora Read-Only External Database Sync Worker")
    parser.add_argument(
        "command",
        choices=["poll", "once", "backfill", "reconcile", "retry-failed", "purge-outbox"],
        default="poll",
        nargs="?",
    )
    parser.add_argument(
        "--source",
        choices=[SOURCE_SCHEDULER, SOURCE_QUOTATIONS, "all"],
        default="all",
        help="Target source system (default: all)",
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=None,
        help="Acked outbox retention days for purge-outbox command",
    )
    args = parser.parse_args()

    cfg = get_sync_config()
    worker = SyncWorker(config=cfg)

    if args.command == "poll":
        worker.run_forever()
    elif args.command == "once":
        if args.source == "all":
            res = worker.poll_all_once()
        else:
            worker.ensure_sources_registered()
            res = {args.source: worker.poll_source_once(args.source)}
        print(json.dumps(res, indent=2))
    elif args.command == "backfill":
        targets = (
            list(worker.source_engines.keys()) if args.source == "all" else [args.source]
        )
        out = {s: worker.backfill_source(s) for s in targets}
        print(json.dumps(out, indent=2))
    elif args.command == "reconcile":
        targets = (
            list(worker.source_engines.keys()) if args.source == "all" else [args.source]
        )
        out = {s: worker.reconcile_source(s) for s in targets}
        print(json.dumps(out, indent=2))
    elif args.command == "retry-failed":
        src = None if args.source == "all" else args.source
        print(json.dumps(worker.retry_failed_events(src), indent=2))
    elif args.command == "purge-outbox":
        print(json.dumps(worker.purge_acked_outbox(args.retention_days), indent=2))


if __name__ == "__main__":
    main()
