from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/polls", tags=["polls"])


# ---- Schemas ----

class PollItemIn(BaseModel):
    candidate_name: str | None = None
    party: str
    support_rate: float


class PollItemOut(PollItemIn):
    id: int
    model_config = {"from_attributes": True}


class PollCreate(BaseModel):
    region_code: str
    election_type: str = "local"
    date: str
    source: str
    sample_size: int | None = None
    margin_of_error: float | None = None
    is_simulated: int = 0
    items: list[PollItemIn]


class PollOut(BaseModel):
    id: int
    region_code: str
    election_type: str
    date: str
    source: str
    sample_size: int | None
    margin_of_error: float | None
    is_simulated: int
    items: list[PollItemOut]

    model_config = {"from_attributes": True}


class RegionPollSummary(BaseModel):
    region_code: str
    region_name: str
    latest_poll: PollOut | None
    poll_count: int
    real_poll_count: int
    leading_party: str | None
    leading_rate: float | None


class BulkPollCreate(BaseModel):
    """批次匯入多筆民調"""
    polls: list[PollCreate]


# ---- Read endpoints ----

@router.get("/summary", response_model=list[RegionPollSummary])
def poll_summary(
    election_type: str = "local",
    include_simulated: bool = True,
    db: Session = Depends(get_db),
):
    """各縣市最新民調摘要"""
    regions = db.query(models.Region).filter(models.Region.level == "city").all()
    results = []

    for region in regions:
        q = db.query(models.Poll).filter(
            models.Poll.region_code == region.code,
            models.Poll.election_type == election_type,
        )
        all_polls = q.order_by(models.Poll.date.desc()).all()
        real_polls = [p for p in all_polls if p.is_simulated == 0]

        if not include_simulated:
            polls = real_polls
        else:
            polls = all_polls

        # Prefer real polls for latest
        latest = real_polls[0] if real_polls else (polls[0] if polls else None)
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
            real_poll_count=len(real_polls),
            leading_party=leading_party,
            leading_rate=leading_rate,
        ))

    results.sort(key=lambda x: x.region_code)
    return results


@router.get("/", response_model=list[PollOut])
def list_polls(
    region_code: str | None = None,
    election_type: str = "local",
    include_simulated: bool = True,
    db: Session = Depends(get_db),
):
    q = db.query(models.Poll).filter(models.Poll.election_type == election_type)
    if region_code:
        q = q.filter(models.Poll.region_code == region_code)
    if not include_simulated:
        q = q.filter(models.Poll.is_simulated == 0)
    return q.order_by(models.Poll.date.desc()).all()


@router.get("/{region_code}", response_model=list[PollOut])
def get_region_polls(region_code: str, db: Session = Depends(get_db)):
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
def get_poll_trend(region_code: str, db: Session = Depends(get_db)):
    """某縣市民調趨勢（按日期排列）"""
    polls = (
        db.query(models.Poll)
        .filter(models.Poll.region_code == region_code)
        .order_by(models.Poll.date)
        .all()
    )
    return [
        {
            "date": p.date,
            "source": p.source,
            "is_simulated": p.is_simulated,
            "parties": {item.party: item.support_rate for item in p.items},
        }
        for p in polls
    ]


# ---- Create / Update / Delete ----

@router.post("/", response_model=PollOut, status_code=201)
def create_poll(data: PollCreate, db: Session = Depends(get_db)):
    """新增一筆民調"""
    region = db.query(models.Region).filter(models.Region.code == data.region_code).first()
    if not region:
        raise HTTPException(400, f"Region {data.region_code} not found")

    poll = models.Poll(
        region_code=data.region_code,
        election_type=data.election_type,
        date=data.date,
        source=data.source,
        sample_size=data.sample_size,
        margin_of_error=data.margin_of_error,
        is_simulated=data.is_simulated,
    )
    db.add(poll)
    db.flush()

    for item in data.items:
        db.add(models.PollItem(
            poll_id=poll.id,
            candidate_name=item.candidate_name,
            party=item.party,
            support_rate=item.support_rate,
        ))

    db.commit()
    db.refresh(poll)
    return poll


@router.post("/bulk", status_code=201)
def bulk_create_polls(data: BulkPollCreate, db: Session = Depends(get_db)):
    """批次匯入多筆民調"""
    created = []
    for poll_data in data.polls:
        region = db.query(models.Region).filter(
            models.Region.code == poll_data.region_code
        ).first()
        if not region:
            continue

        poll = models.Poll(
            region_code=poll_data.region_code,
            election_type=poll_data.election_type,
            date=poll_data.date,
            source=poll_data.source,
            sample_size=poll_data.sample_size,
            margin_of_error=poll_data.margin_of_error,
            is_simulated=poll_data.is_simulated,
        )
        db.add(poll)
        db.flush()

        for item in poll_data.items:
            db.add(models.PollItem(
                poll_id=poll.id,
                candidate_name=item.candidate_name,
                party=item.party,
                support_rate=item.support_rate,
            ))
        created.append(poll.id)

    db.commit()
    return {"created": len(created), "poll_ids": created}


@router.put("/{poll_id}", response_model=PollOut)
def update_poll(poll_id: int, data: PollCreate, db: Session = Depends(get_db)):
    """更新一筆民調（整筆替換）"""
    poll = db.query(models.Poll).filter(models.Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(404, "Poll not found")

    poll.region_code = data.region_code
    poll.election_type = data.election_type
    poll.date = data.date
    poll.source = data.source
    poll.sample_size = data.sample_size
    poll.margin_of_error = data.margin_of_error
    poll.is_simulated = data.is_simulated

    # Replace items
    db.query(models.PollItem).filter(models.PollItem.poll_id == poll_id).delete()
    for item in data.items:
        db.add(models.PollItem(
            poll_id=poll.id,
            candidate_name=item.candidate_name,
            party=item.party,
            support_rate=item.support_rate,
        ))

    db.commit()
    db.refresh(poll)
    return poll


@router.delete("/{poll_id}", status_code=204)
def delete_poll(poll_id: int, db: Session = Depends(get_db)):
    """刪除一筆民調"""
    poll = db.query(models.Poll).filter(models.Poll.id == poll_id).first()
    if not poll:
        raise HTTPException(404, "Poll not found")
    db.delete(poll)
    db.commit()


@router.delete("/simulated/all", status_code=200)
def delete_all_simulated(db: Session = Depends(get_db)):
    """清除所有模擬民調"""
    count = db.query(models.Poll).filter(models.Poll.is_simulated == 1).count()
    db.query(models.PollItem).filter(
        models.PollItem.poll_id.in_(
            db.query(models.Poll.id).filter(models.Poll.is_simulated == 1)
        )
    ).delete(synchronize_session=False)
    db.query(models.Poll).filter(models.Poll.is_simulated == 1).delete()
    db.commit()
    return {"deleted": count}
