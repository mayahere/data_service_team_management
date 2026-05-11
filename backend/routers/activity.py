import uuid
import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from models import AuditLog
from auth import get_current_user

router = APIRouter(prefix="/activity", tags=["activity"])


def log_activity(
    session: Session,
    entity_type: str,
    entity_id: str,
    entity_title: str,
    action: str,
    actor_name: str,
    project_name: str,
    detail: Optional[str] = None,
) -> None:
    entry = AuditLog(
        log_id=str(uuid.uuid4()),
        entity_type=entity_type,
        entity_id=entity_id,
        entity_title=entity_title,
        action=action,
        detail=detail,
        actor_name=actor_name,
        project_name=project_name,
        timestamp=datetime.datetime.utcnow().isoformat(),
    )
    session.add(entry)


@router.get("")
def get_activity(
    limit: int = 30,
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
):
    logs = session.exec(
        select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
    ).all()
    return [l.model_dump() for l in logs]
