from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/api/compare", tags=["compare"])


@router.post("/", response_model=list[schemas.CompareItem])
def compare_elections(
    req: schemas.CompareRequest,
    db: Session = Depends(get_db),
):
    elections = (
        db.query(models.Election)
        .filter(models.Election.id.in_(req.election_ids))
        .all()
    )

    # If no region_codes specified, use all city-level regions
    if req.region_codes:
        regions = (
            db.query(models.Region)
            .filter(models.Region.code.in_(req.region_codes))
            .all()
        )
    else:
        regions = (
            db.query(models.Region)
            .filter(models.Region.level == "city")
            .all()
        )

    items = []
    for election in elections:
        for region in regions:
            rows = (
                db.query(models.RegionResult)
                .filter(
                    models.RegionResult.election_id == election.id,
                    models.RegionResult.region_code == region.code,
                )
                .all()
            )
            results = []
            for r in rows:
                item = schemas.RegionResultOut.model_validate(r)
                if r.candidate:
                    item.candidate_name = r.candidate.name
                    item.candidate_party = r.candidate.party
                results.append(item)
            if results:
                items.append(
                    schemas.CompareItem(
                        election=schemas.ElectionOut.model_validate(election),
                        region_code=region.code,
                        region_name=region.name,
                        results=results,
                    )
                )
    return items
