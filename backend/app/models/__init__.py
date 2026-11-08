from app.db.base import Base, TimestampMixin, SoftDeleteMixin
from app.models.auth import User, Role, Permission, Department, Employee, user_roles, role_permissions
from app.models.customer import Customer, CustomerContact
from app.models.enquiry import Enquiry, EnquiryStatusHistory
from app.models.design import Design, DesignVersion, DesignStatusHistory
from app.models.quotation import Quotation, QuotationItem, QuotationRevision, QuotationFollowUp, QuotationStatusHistory
from app.models.production import WorkOrder, ProductionTask, Installation, WorkOrderStatusHistory
from app.models.feedback import Feedback, FeedbackCategory
from app.models.labour import Worker, LabourRequest, LabourAssignment
from app.models.system import AuditLog, Notification, Attachment, SystemSetting

__all__ = [
    "Base",
    "TimestampMixin",
    "SoftDeleteMixin",
    "User",
    "Role",
    "Permission",
    "Department",
    "Employee",
    "user_roles",
    "role_permissions",
    "Customer",
    "CustomerContact",
    "Enquiry",
    "EnquiryStatusHistory",
    "Design",
    "DesignVersion",
    "DesignStatusHistory",
    "Quotation",
    "QuotationItem",
    "QuotationRevision",
    "QuotationFollowUp",
    "QuotationStatusHistory",
    "WorkOrder",
    "ProductionTask",
    "Installation",
    "WorkOrderStatusHistory",
    "Feedback",
    "FeedbackCategory",
    "Worker",
    "LabourRequest",
    "LabourAssignment",
    "AuditLog",
    "Notification",
    "Attachment",
    "SystemSetting",
]
