"""
Pydantic schemas for Coordinator dashboard and operations.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# =============================================================================
# DASHBOARD SCHEMAS
# =============================================================================

class DashboardStats(BaseModel):
    """Coordinator dashboard statistics"""
    calls: 'CallStats'
    applications: 'ApplicationStats'
    submissions: 'SubmissionStats'


class DepartmentStats(BaseModel):
    """Statistics per department"""
    department: str
    department_display: str
    calls_count: int
    applications_count: int
    approved_count: int


class CallStats(BaseModel):
    """Overall call status statistics"""
    total: int
    draft: int
    published: int
    closed: int
    under_review: int
    results_published: int


# =============================================================================
# PENDING REVIEW SCHEMAS
# =============================================================================

class PendingApplicationOut(BaseModel):
    """Pending application for review"""
    id: int
    call_id: int
    call_title: str
    call_reference: str
    company_id: int
    company_name: str
    status: str
    submitted_at: datetime
    days_pending: int
    documents_count: int
    documents_complete: bool
    
    class Config:
        from_attributes = True


class PendingSubmissionOut(BaseModel):
    """Pending employee submission for review"""
    id: int
    application_id: int
    call_title: str
    company_name: str
    employee_name: str
    employee_email: str
    status: str
    submitted_at: datetime
    days_pending: int
    documents_count: int
    documents_complete: bool
    
    class Config:
        from_attributes = True


class PendingReviewsResponse(BaseModel):
    """All pending reviews for coordinator"""
    items: List['PendingReviewItem']
    total: int


# =============================================================================
# ANALYTICS SCHEMAS
# =============================================================================

class TimeSeriesPoint(BaseModel):
    """Data point for time series"""
    date: str
    value: int


class ApplicationsOverTime(BaseModel):
    """Applications over time"""
    labels: List[str]
    submitted: List[int]
    approved: List[int]
    rejected: List[int]


class DepartmentDistribution(BaseModel):
    """Distribution by department"""
    department: str
    department_display: str
    count: int
    percentage: float


class AnalyticsData(BaseModel):
    """Analytics data payload"""
    period_days: int
    applications_by_status: dict
    applications_over_time: list
    calls_by_department: dict
    approval_rate: float
    total_calls: int
    total_applications: int


class AnalyticsResponse(BaseModel):
    """Full analytics response"""
    data: AnalyticsData
    generated_at: str


# =============================================================================
# DASHBOARD RESPONSES
# =============================================================================

class DashboardResponse(BaseModel):
    """Full dashboard response"""
    stats: DashboardStats
    last_updated: str


class CoordinatorCallListOut(BaseModel):
    """Call list item for coordinator"""
    id: int
    title: str
    reference_number: str
    department: str
    status: str
    application_start_date: datetime
    application_deadline: datetime
    created_at: datetime
    published_at: Optional[datetime]
    applications_count: int
    pending_count: int
    approved_count: int
    
    class Config:
        from_attributes = True


class CoordinatorCallListResponse(BaseModel):
    """Coordinator's calls list"""
    calls: List[CoordinatorCallListOut]
    total: int
    page: int
    per_page: int
    total_pages: int


# =============================================================================
# ADDITIONAL SCHEMAS FOR API COMPATIBILITY
# =============================================================================

class PendingReviewItem(BaseModel):
    """Generic pending review item"""
    id: int
    type: str  # 'application' or 'submission'
    call_id: Optional[int] = None
    company_id: Optional[int] = None
    application_id: Optional[int] = None
    employee_id: Optional[int] = None
    submitted_at: Optional[datetime] = None
    days_pending: int = 0
    status: str
    
    class Config:
        from_attributes = True


class RecentActivityItem(BaseModel):
    """Recent activity log entry"""
    id: int
    action: str
    entity_type: str
    entity_id: int
    entity_name: Optional[str] = None
    user_name: Optional[str] = None
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    user_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class RecentActivityResponse(BaseModel):
    """Recent activity response"""
    activities: List[RecentActivityItem]
    total: int


class ApplicationStats(BaseModel):
    """Application statistics"""
    total: int
    pending: int
    submitted: int = 0
    under_review: int
    approved: int
    rejected: int
    additional_info_requested: int = 0


class SubmissionStats(BaseModel):
    """Submission statistics"""
    total: int
    pending: int
    submitted: int = 0
    under_review: int = 0
    approved: int
    rejected: int


# Resolve forward references
DashboardStats.model_rebuild()
PendingReviewsResponse.model_rebuild()



