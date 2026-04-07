from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/regions", tags=["regions"])


@router.get("/", response_model=list[schemas.RegionOut])
def list_regions(
    level: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Region)
    if level:
        q = q.filter(models.Region.level == level)
    return q.order_by(models.Region.code).all()


@router.get("/{region_code}", response_model=schemas.RegionOut)
def get_region(region_code: str, db: Session = Depends(get_db)):
    region = (
        db.query(models.Region).filter(models.Region.code == region_code).first()
    )
    if not region:
        raise HTTPException(404, "Region not found")
    return region


@router.get("/{region_code}/history", response_model=list[schemas.RegionHistoryItem])
def get_region_history(
    region_code: str,
    type: str | None = None,
    db: Session = Depends(get_db),
):
    region = (
        db.query(models.Region).filter(models.Region.code == region_code).first()
    )
    if not region:
        raise HTTPException(404, "Region not found")

    q = db.query(models.Election).order_by(models.Election.year)
    if type:
        q = q.filter(models.Election.type == type)

    history = []
    for election in q.all():
        rows = (
            db.query(models.RegionResult)
            .filter(
                models.RegionResult.election_id == election.id,
                models.RegionResult.region_code == region_code,
            )
            .all()
        )
        if not rows:
            continue
        results = []
        for r in rows:
            item = schemas.RegionResultOut.model_validate(r)
            if r.candidate:
                item.candidate_name = r.candidate.name
                item.candidate_party = r.candidate.party
            results.append(item)
        history.append(
            schemas.RegionHistoryItem(
                year=election.year,
                election_name=election.name,
                election_type=election.type,
                results=results,
            )
        )
    return history
