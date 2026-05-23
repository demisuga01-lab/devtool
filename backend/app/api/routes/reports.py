from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.routes._utils import client_ip, iso, parse_page, rate_limit, require_admin_password, sanitize_text
from app.core.database import get_db
from app.models.extended import FilePaste, Gist, Report
from app.models.paste import Paste

router = APIRouter(prefix="/reports", tags=["reports"])

ALLOWED_TYPES = {"paste", "gist", "file_paste"}
ALLOWED_REASONS = {"spam", "illegal", "malware", "other"}
ALLOWED_STATUSES = {"pending", "reviewed", "actioned", "dismissed"}


class ReportCreate(BaseModel):
    content_type: str = Field(..., max_length=40)
    content_id: str = Field(..., max_length=120)
    reason: str = Field(..., max_length=40)
    details: str | None = Field(default=None, max_length=2000)


class ReportUpdate(BaseModel):
    status: str = Field(..., max_length=40)
    admin_notes: str | None = Field(default=None, max_length=2000)


def _serialize_report(report: Report) -> dict:
    return {
        "id": report.id,
        "content_type": report.content_type,
        "content_id": report.content_id,
        "reason": report.reason,
        "details": report.details,
        "reporter_ip": report.reporter_ip,
        "created_at": iso(report.created_at),
        "status": report.status,
        "admin_notes": report.admin_notes,
    }


def _delete_reported_content(report: Report, db: Session) -> None:
    if report.content_type == "paste":
        item = db.query(Paste).filter(Paste.id == report.content_id).first()
    elif report.content_type == "gist":
        item = db.query(Gist).filter(Gist.id == report.content_id).first()
    elif report.content_type == "file_paste":
        item = db.query(FilePaste).filter(FilePaste.id == report.content_id).first()
    else:
        item = None
    if item is not None:
        db.delete(item)


@router.post("")
async def submit_report(payload: ReportCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    rate_limit(request, "reports:create", 5, 60 * 60)
    content_type = sanitize_text(payload.content_type, 40, allow_empty=False)
    reason = sanitize_text(payload.reason, 40, allow_empty=False)
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported content type.")
    if reason not in ALLOWED_REASONS:
        raise HTTPException(status_code=400, detail="Unsupported report reason.")

    report = Report(
        content_type=content_type,
        content_id=sanitize_text(payload.content_id, 120, allow_empty=False),
        reason=reason,
        details=sanitize_text(payload.details, 2000) if payload.details else None,
        reporter_ip=client_ip(request),
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"id": report.id, "message": "Report submitted"}


@router.get("")
async def list_reports(
    request: Request,
    status: str = Query("pending"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> dict:
    require_admin_password(request)
    page, per_page = parse_page(page, per_page)
    query = db.query(Report)
    if status != "all":
        if status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Unsupported report status.")
        query = query.filter(Report.status == status)
    total = query.count()
    reports = query.order_by(Report.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {"items": [_serialize_report(report) for report in reports], "page": page, "per_page": per_page, "total": total}


@router.patch("/{report_id}")
async def update_report(report_id: str, payload: ReportUpdate, request: Request, db: Session = Depends(get_db)) -> dict:
    require_admin_password(request)
    report = db.query(Report).filter(Report.id == report_id).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    status = sanitize_text(payload.status, 40, allow_empty=False)
    if status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Unsupported report status.")
    report.status = status
    report.admin_notes = sanitize_text(payload.admin_notes, 2000) if payload.admin_notes else None
    if status == "actioned":
        _delete_reported_content(report, db)
    db.commit()
    db.refresh(report)
    return _serialize_report(report)
