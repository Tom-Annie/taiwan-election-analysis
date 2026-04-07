from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/polls", tags=["polls"])


class PollItemOut(BaseModel):
    candidate_name: str | None
    party: str
    support_rate: float

    model_config = {"from_attributes": True}


class PollOut(BaseModel):
    id: int
    region_code: str
    election_type: str
    date: str
    source: str
    sample_size: int | None
    margin_of_error: float | None
    items: list[PollItemOut]

    model_config = {"from_attributes": True}


class RegionPollSummary(BaseModel):
    region_code: str
    region_name: str
    latest_poll: PollOut | None
    poll_count: int
    leading_party: str | None
    leading_rate: float | None


@router.get("/", response_model=list[PollOut])
def list_polls(
    region_code: str | None = None,
    election_type: str = "local",
    db: Session = Depends(get_db),
):
    q = db.query(models.Poll).filter(models.Poll.election_type == election_type)
    if region_code:
        q = q.filter(models.Poll.region_code == region_code)
    return q.order_by(models.Poll.date.desc()).all()


@router.get("/summary", response_model=list[RegionPollSummary])
def poll_summary(
    election_type: str = "local",
    db: Session = Depends(get_db),
):
    """各縣市最新民調摘要"""
    regions = db.query(models.Region).filter(models.Region.level == "city").all()
    results = []

    for region in regions:
        polls = (
            db.query(models.Poll)
            .filter(
                models.Poll.region_code == region.code,
                models.Poll.election_type == election_type,
            )
            .order_by(models.Poll.date.desc())
            .all()
        )

        latest = polls[0] if polls else None
        leading_party = None
        leading_rate = None

        if latest and latest.items:
            top = max(latest.items, key=lambda x: x.support_rate)
            leading_party = top.party
            leading_rate = top.support_rate

        results.append(RegionPollSummary(
            region_code=region.code,
            region_name=region.name,
            latest_poll=latest,
            poll_count=len(polls),
            leading_party=leading_party,
            leading_rate=leading_rate,
        ))

    results.sort(key=lambda x: x.region_code)
    return results


@router.get("/{region_code}", response_model=list[PollOut])
def get_region_polls(
    region_code: str,
    db: Session = Depends(get_db),
):
    region = db.query(models.Region).filter(models.Region.code == region_code).first()
    if not region:
        raise HTTPException(404, "Region not found")

    return (
        db.query(models.Poll)
        .filter(models.Poll.region_code == region_code)
        .order_by(models.Poll.date.desc())
        .all()
    )


@router.get("/{region_code}/trend")
def get_poll_trend(
    region_code: str,
    db: Session = Depends(get_db),
):
    """某縣市民調趨勢（按日期排列）"""
    polls = (
        db.query(models.Poll)
        .filter(models.Poll.region_code == region_code)
        .order_by(models.Poll.date)
        .all()
    )

    trend = []
    for poll in polls:
        entry = {
            "date": poll.date,
            "source": poll.source,
            "parties": {},
        }
        for item in poll.items:
            entry["parties"][item.party] = item.support_rate
        trend.append(entry)

    return trend
