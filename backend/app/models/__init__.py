from app.db.base import Base, TimestampMixin, SoftDeleteMixin
from app.models.auth import User, Role, Permission, Department, Employee, user_roles, role_permissions
from app.models.customer import Customer, CustomerContact
from app.models.project import Project, ProjectStatusHistory, ProjectMilestone
from app.models.enquiry import Enquiry, EnquiryStatusHistory
from app.models.design import Design, DesignVersion, DesignStatusHistory
from app.models.quotation import Quotation, QuotationItem, QuotationRevision, QuotationFollowUp, QuotationStatusHistory
from app.models.production import WorkOrder, ProductionTask, ProductionUpdate, Installation, WorkOrderStatusHistory, ProductionSlot
from app.models.accounts import AccountsRecord, Invoice, Payment
from app.models.feedback import Feedback, FeedbackCategory
from app.models.labour import Worker, LabourRequest, LabourAssignment
from app.models.communication import Communication, CommunicationMessage
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
    "Project",
    "ProjectStatusHistory",
    "ProjectMilestone",
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
    "ProductionUpdate",
    "Installation",
    "WorkOrderStatusHistory",
    "ProductionSlot",
    "AccountsRecord",
    "Invoice",
    "Payment",
    "Feedback",
    "FeedbackCategory",
    "Worker",
    "LabourRequest",
    "LabourAssignment",
    "Communication",
    "CommunicationMessage",
    "AuditLog",
    "Notification",
    "Attachment",
    "SystemSetting",
]
