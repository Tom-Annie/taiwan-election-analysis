from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/elections", tags=["elections"])


@router.get("/", response_model=list[schemas.ElectionOut])
def list_elections(
    year: int | None = None,
    type: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Election)
    if year:
        q = q.filter(models.Election.year == year)
    if type:
        q = q.filter(models.Election.type == type)
    return q.order_by(models.Election.year.desc()).all()


@router.get("/{election_id}", response_model=schemas.ElectionDetailOut)
def get_election(election_id: int, db: Session = Depends(get_db)):
    election = db.query(models.Election).get(election_id)
    if not election:
        raise HTTPException(404, "Election not found")
    return election


@router.get("/{election_id}/results", response_model=list[schemas.RegionResultOut])
def get_election_results(
    election_id: int,
    region_code: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.RegionResult).filter(
        models.RegionResult.election_id == election_id
    )
    if region_code:
        q = q.filter(models.RegionResult.region_code == region_code)

    rows = q.all()
    results = []
    for r in rows:
        item = schemas.RegionResultOut.model_validate(r)
        if r.candidate:
            item.candidate_name = r.candidate.name
            item.candidate_party = r.candidate.party
        results.append(item)
    return results


@router.get("/parties/trend", response_model=list[schemas.PartyTrendItem])
def get_party_trend(
    type: str = "presidential",
    db: Session = Depends(get_db),
):
    elections = (
        db.query(models.Election)
        .filter(models.Election.type == type)
        .order_by(models.Election.year)
        .all()
    )
    results = []
    for e in elections:
        party_votes: dict[str, int] = {}
        for c in e.candidates:
            party = c.party or "無黨籍"
            party_votes[party] = party_votes.get(party, 0) + (c.total_votes or 0)
        total = sum(party_votes.values()) or 1
        for party, votes in party_votes.items():
            results.append(
                schemas.PartyTrendItem(
                    year=e.year,
                    election_name=e.name,
                    party=party,
                    total_votes=votes,
                    vote_rate=round(votes / total * 100, 2),
                )
            )
    return results
