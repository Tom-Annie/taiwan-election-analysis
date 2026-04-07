"""Dashboard API — 首頁儀表板聚合端點"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..services.prediction import predict_all, get_prediction_summary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/")
def get_dashboard(db: Session = Depends(get_db)):
    """一次取得首頁所需的全部資料"""

    # 1. 預測摘要
    pred_summary = get_prediction_summary(db)

    # 2. 最新民調動態（最近 5 筆真實民調）
    recent_polls = (
        db.query(models.Poll)
        .filter(models.Poll.is_simulated == 0)
        .order_by(models.Poll.date.desc())
        .limit(5)
        .all()
    )
    # fallback to simulated if no real polls
    if not recent_polls:
        recent_polls = (
            db.query(models.Poll)
            .order_by(models.Poll.date.desc())
            .limit(5)
            .all()
        )

    poll_feed = []
    for p in recent_polls:
        region = db.query(models.Region).filter(models.Region.code == p.region_code).first()
        items_sorted = sorted(p.items, key=lambda x: -x.support_rate)
        poll_feed.append({
            "region_code": p.region_code,
            "region_name": region.name if region else p.region_code,
            "date": p.date,
            "source": p.source,
            "is_simulated": p.is_simulated,
            "leading_party": items_sorted[0].party if items_sorted else None,
            "leading_rate": items_sorted[0].support_rate if items_sorted else None,
            "items": [
                {"party": it.party, "rate": it.support_rate, "name": it.candidate_name}
                for it in items_sorted
            ],
        })

    # 3. 投票率趨勢 (所有選舉)
    elections = db.query(models.Election).order_by(models.Election.year).all()
    turnout_trend = [
        {
            "year": e.year,
            "type": e.type,
            "name": e.name,
            "turnout_rate": e.turnout_rate,
        }
        for e in elections if e.turnout_rate
    ]

    # 4. 選舉統計
    total_elections = db.query(models.Election).count()
    total_candidates = db.query(models.Candidate).count()
    total_regions = db.query(models.Region).filter(models.Region.level == "city").count()
    total_polls = db.query(models.Poll).count()
    real_polls = db.query(models.Poll).filter(models.Poll.is_simulated == 0).count()

    # 5. 各縣市投票率 (最近一屆地方選舉)
    latest_local = (
        db.query(models.Election)
        .filter(models.Election.type == "local")
        .order_by(models.Election.year.desc())
        .first()
    )
    region_turnout = []
    if latest_local:
        regions = db.query(models.Region).filter(models.Region.level == "city").all()
        for region in regions:
            result = (
                db.query(models.RegionResult)
                .filter(
                    models.RegionResult.election_id == latest_local.id,
                    models.RegionResult.region_code == region.code,
                )
                .first()
            )
            if result:
                region_turnout.append({
                    "code": region.code,
                    "name": region.name,
                    "turnout_rate": result.turnout_rate,
                    "population": region.population,
                })
        region_turnout.sort(key=lambda x: x["turnout_rate"] or 0, reverse=True)

    return {
        "prediction": pred_summary,
        "recent_polls": poll_feed,
        "turnout_trend": turnout_trend,
        "region_turnout": region_turnout,
        "stats": {
            "total_elections": total_elections,
            "total_candidates": total_candidates,
            "total_regions": total_regions,
            "total_polls": total_polls,
            "real_polls": real_polls,
        },
    }


@router.get("/export/predictions")
def export_predictions_csv(db: Session = Depends(get_db)):
    """匯出預測結果為 CSV"""
    from fastapi.responses import StreamingResponse
    import io, csv

    preds = predict_all(db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "縣市", "代碼", "預測勝選黨", "勝率%", "信心度%",
        "民進黨%", "國民黨%", "民眾黨%", "其他%",
        "資料品質", "民調數"
    ])
    for p in preds:
        writer.writerow([
            p["region_name"], p["region_code"],
            p["predicted_winner"], p["win_probability"], p["confidence"],
            p["predicted_rates"].get("民主進步黨", 0),
            p["predicted_rates"].get("中國國民黨", 0),
            p["predicted_rates"].get("台灣民眾黨", 0),
            p["predicted_rates"].get("其他/無黨籍", 0),
            p["data_quality"], p["poll_count"],
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictions_2026.csv"},
    )


@router.get("/export/polls")
def export_polls_csv(db: Session = Depends(get_db)):
    """匯出民調資料為 CSV"""
    from fastapi.responses import StreamingResponse
    import io, csv

    polls = (
        db.query(models.Poll)
        .order_by(models.Poll.date.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "縣市代碼", "日期", "機構", "樣本數", "誤差%",
        "是否模擬", "政黨", "候選人", "支持率%"
    ])
    for p in polls:
        for item in p.items:
            writer.writerow([
                p.region_code, p.date, p.source,
                p.sample_size, p.margin_of_error,
                "模擬" if p.is_simulated else "真實",
                item.party, item.candidate_name or "",
                item.support_rate,
            ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=polls_2026.csv"},
    )
