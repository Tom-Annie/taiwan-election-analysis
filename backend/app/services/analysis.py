"""分析服務 — 提供統計計算與趨勢分析"""

from sqlalchemy.orm import Session
from .. import models


def get_swing_regions(
    db: Session,
    election_id_a: int,
    election_id_b: int,
    party: str,
    top_n: int = 10,
) -> list[dict]:
    """找出兩屆選舉間，特定政黨得票率變化最大的區域"""

    results_a = (
        db.query(models.RegionResult)
        .join(models.Candidate)
        .filter(
            models.RegionResult.election_id == election_id_a,
            models.Candidate.party == party,
        )
        .all()
    )
    results_b = (
        db.query(models.RegionResult)
        .join(models.Candidate)
        .filter(
            models.RegionResult.election_id == election_id_b,
            models.Candidate.party == party,
        )
        .all()
    )

    map_a = {r.region_code: r.vote_rate or 0 for r in results_a}
    map_b = {r.region_code: r.vote_rate or 0 for r in results_b}

    swings = []
    for code in set(map_a) & set(map_b):
        diff = map_b[code] - map_a[code]
        region = db.query(models.Region).filter(models.Region.code == code).first()
        swings.append({
            "region_code": code,
            "region_name": region.name if region else code,
            "rate_a": map_a[code],
            "rate_b": map_b[code],
            "swing": round(diff, 2),
        })

    swings.sort(key=lambda x: abs(x["swing"]), reverse=True)
    return swings[:top_n]


def get_turnout_trend(db: Session, region_code: str | None = None) -> list[dict]:
    """取得投票率趨勢"""
    elections = (
        db.query(models.Election)
        .order_by(models.Election.year)
        .all()
    )
    trend = []
    for e in elections:
        if region_code:
            rows = (
                db.query(models.RegionResult)
                .filter(
                    models.RegionResult.election_id == e.id,
                    models.RegionResult.region_code == region_code,
                )
                .all()
            )
            if rows:
                turnout = rows[0].turnout_rate
            else:
                continue
        else:
            turnout = e.turnout_rate
        trend.append({
            "year": e.year,
            "election_name": e.name,
            "turnout_rate": turnout,
        })
    return trend
