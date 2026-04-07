"""立法委員選舉 API — 國會席次分析"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models

router = APIRouter(prefix="/api/legislative", tags=["legislative"])


@router.get("/seats")
def get_seat_history(db: Session = Depends(get_db)):
    """各屆國會席次分布"""
    elections = (
        db.query(models.Election)
        .filter(models.Election.type == "legislative")
        .order_by(models.Election.year)
        .all()
    )

    results = []
    for e in elections:
        candidates = (
            db.query(models.Candidate)
            .filter(models.Candidate.election_id == e.id)
            .order_by(models.Candidate.total_votes.desc())
            .all()
        )

        parties = []
        for c in candidates:
            parties.append({
                "party": c.party or "無黨籍",
                "seats": c.total_votes or 0,  # total_votes stores seats
                "vote_rate": c.vote_rate,      # party list vote rate
                "elected": c.elected,
            })

        total_seats = sum(p["seats"] for p in parties)
        results.append({
            "year": e.year,
            "name": e.name,
            "total_seats": total_seats,
            "parties": parties,
        })

    return results


@router.get("/trend")
def get_party_seat_trend(db: Session = Depends(get_db)):
    """各黨歷屆席次趨勢（轉置方便前端畫圖）"""
    elections = (
        db.query(models.Election)
        .filter(models.Election.type == "legislative")
        .order_by(models.Election.year)
        .all()
    )

    trend = []
    for e in elections:
        row = {"year": e.year}
        candidates = (
            db.query(models.Candidate)
            .filter(models.Candidate.election_id == e.id)
            .all()
        )
        for c in candidates:
            party = c.party or "無黨籍"
            row[party] = (c.total_votes or 0)
        trend.append(row)

    return trend
