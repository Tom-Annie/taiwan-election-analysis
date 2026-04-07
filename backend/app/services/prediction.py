"""預測服務 — 2026 縣市長選舉預測模型

方法：加權歷史趨勢 + 總統選舉鐘擺效應 + 在任者優勢/劣勢
- 近期選舉權重較高 (2022 > 2018 > 2014)
- 參考最近一次總統大選 (2024) 的該區政黨基本盤
- 考慮執政黨通常在地方選舉的鐘擺效應
"""

from sqlalchemy.orm import Session
from .. import models
import numpy as np


# 2022 當選者 (region_code -> (name, party))
INCUMBENTS_2022 = {
    "TPE": ("蔣萬安", "中國國民黨"),
    "NTC": ("侯友宜", "中國國民黨"),
    "TAO": ("張善政", "中國國民黨"),
    "TXG": ("盧秀燕", "中國國民黨"),
    "TNN": ("黃偉哲", "民主進步黨"),
    "KHH": ("陳其邁", "民主進步黨"),
    "KLU": ("謝國樑", "中國國民黨"),
    "HSZ": ("高虹安", "台灣民眾黨"),
    "HSQ": ("楊文科", "中國國民黨"),
    "MIA": ("鍾東錦", "無黨籍"),
    "CHA": ("王惠美", "中國國民黨"),
    "NAN": ("許淑華", "中國國民黨"),
    "YLN": ("張麗善", "中國國民黨"),
    "CYI": ("黃敏惠", "中國國民黨"),
    "CYQ": ("翁章梁", "民主進步黨"),
    "PIF": ("周春米", "民主進步黨"),
    "ILA": ("林姿妙", "中國國民黨"),
    "HUA": ("徐榛蔚", "中國國民黨"),
    "TTT": ("饒慶鈴", "中國國民黨"),
    "PEN": ("陳光復", "民主進步黨"),
    "KMN": ("陳福海", "無黨籍"),
    "LIE": ("王忠銘", "中國國民黨"),
}

# 主要政黨
MAJOR_PARTIES = ["民主進步黨", "中國國民黨", "台灣民眾黨"]


def _get_local_party_rates(db: Session, region_code: str) -> dict[int, dict[str, float]]:
    """取得該區域歷屆地方選舉各黨得票率"""
    local_elections = (
        db.query(models.Election)
        .filter(models.Election.type == "local")
        .order_by(models.Election.year)
        .all()
    )

    history = {}
    for election in local_elections:
        results = (
            db.query(models.RegionResult)
            .filter(
                models.RegionResult.election_id == election.id,
                models.RegionResult.region_code == region_code,
            )
            .all()
        )
        if not results:
            continue

        party_rates = {}
        for r in results:
            if r.candidate:
                party = r.candidate.party or "無黨籍"
                party_rates[party] = party_rates.get(party, 0) + (r.vote_rate or 0)
        history[election.year] = party_rates

    return history


def _get_presidential_base(db: Session, region_code: str) -> dict[str, float]:
    """取得 2024 總統大選該區各黨得票率作為基本盤"""
    election = (
        db.query(models.Election)
        .filter(models.Election.year == 2024, models.Election.type == "presidential")
        .first()
    )
    if not election:
        return {}

    results = (
        db.query(models.RegionResult)
        .filter(
            models.RegionResult.election_id == election.id,
            models.RegionResult.region_code == region_code,
        )
        .all()
    )

    party_rates = {}
    for r in results:
        if r.candidate:
            party = r.candidate.party or "無黨籍"
            party_rates[party] = r.vote_rate or 0
    return party_rates


def predict_region(db: Session, region_code: str) -> dict:
    """預測單一縣市 2026 選舉結果"""

    region = db.query(models.Region).filter(models.Region.code == region_code).first()
    if not region:
        return None

    # 1. 歷屆地方選舉得票率
    local_history = _get_local_party_rates(db, region_code)
    # 2. 總統選舉基本盤
    pres_base = _get_presidential_base(db, region_code)
    # 3. 現任者
    incumbent = INCUMBENTS_2022.get(region_code)

    # 加權計算：2022 權重 0.50, 2018 權重 0.30, 2014 權重 0.20
    weights = {2022: 0.50, 2018: 0.30, 2014: 0.20}
    party_scores = {}

    for party in MAJOR_PARTIES:
        weighted_sum = 0
        weight_total = 0
        for year, w in weights.items():
            if year in local_history and party in local_history[year]:
                weighted_sum += local_history[year][party] * w
                weight_total += w

        if weight_total > 0:
            local_trend = weighted_sum / weight_total
        else:
            local_trend = 0

        pres_rate = pres_base.get(party, 0)

        # 組合：地方趨勢 60% + 總統基本盤 40%
        base_score = local_trend * 0.6 + pres_rate * 0.4

        # 鐘擺效應：中央執政黨 (民進黨) 在地方選舉通常 -3~5%
        if party == "民主進步黨":
            base_score -= 2.5  # 執政黨鐘擺

        # 在任者效應
        if incumbent and incumbent[1] == party:
            base_score += 2.0  # 在任優勢（知名度、資源）

        # 台灣民眾黨成長趨勢 (2022→2024 上升中)
        if party == "台灣民眾黨":
            base_score += 1.5

        party_scores[party] = max(base_score, 1.0)

    # 其他/無黨籍
    other_rate = max(100 - sum(party_scores.values()), 5.0)
    party_scores["其他/無黨籍"] = other_rate

    # 正規化到 100%
    total = sum(party_scores.values())
    for party in party_scores:
        party_scores[party] = round(party_scores[party] / total * 100, 1)

    # 信心指數：有越多屆歷史資料 → 越高信心
    data_points = sum(1 for y in [2014, 2018, 2022] if y in local_history)
    has_pres = 1 if pres_base else 0
    confidence = min(round((data_points * 25 + has_pres * 15 + 10) * 1.0, 1), 95.0)

    # 判定預測勝選方
    predicted_winner_party = max(
        [p for p in MAJOR_PARTIES if p in party_scores],
        key=lambda p: party_scores.get(p, 0),
    )

    # 勝選機率 (基於得票差距)
    sorted_parties = sorted(party_scores.items(), key=lambda x: -x[1])
    if len(sorted_parties) >= 2:
        gap = sorted_parties[0][1] - sorted_parties[1][1]
        win_probability = min(50 + gap * 2.5, 95.0)
    else:
        win_probability = 70.0

    # 歷史趨勢
    trend = []
    for year in sorted(local_history.keys()):
        trend.append({
            "year": year,
            "parties": local_history[year],
        })

    return {
        "region_code": region_code,
        "region_name": region.name,
        "prediction_year": 2026,
        "incumbent": {
            "name": incumbent[0] if incumbent else None,
            "party": incumbent[1] if incumbent else None,
        },
        "predicted_rates": party_scores,
        "predicted_winner": predicted_winner_party,
        "win_probability": round(win_probability, 1),
        "confidence": confidence,
        "factors": {
            "local_history_weight": 0.6,
            "presidential_base_weight": 0.4,
            "pendulum_effect": -2.5,
            "incumbency_bonus": 2.0,
            "tpp_growth": 1.5,
        },
        "history": trend,
    }


def predict_all(db: Session) -> list[dict]:
    """預測全部縣市"""
    regions = db.query(models.Region).filter(models.Region.level == "city").all()
    results = []
    for region in regions:
        pred = predict_region(db, region.code)
        if pred:
            results.append(pred)
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return results


def get_prediction_summary(db: Session) -> dict:
    """預測總覽 — 各黨預估席次"""
    all_preds = predict_all(db)

    party_seats = {}
    party_regions = {}
    for pred in all_preds:
        winner = pred["predicted_winner"]
        party_seats[winner] = party_seats.get(winner, 0) + 1
        if winner not in party_regions:
            party_regions[winner] = []
        party_regions[winner].append(pred["region_name"])

    battlegrounds = [
        p for p in all_preds
        if p["win_probability"] < 65
    ]
    battlegrounds.sort(key=lambda x: x["win_probability"])

    return {
        "prediction_year": 2026,
        "total_seats": len(all_preds),
        "party_seats": party_seats,
        "party_regions": party_regions,
        "battlegrounds": battlegrounds[:6],
        "avg_confidence": round(
            np.mean([p["confidence"] for p in all_preds]), 1
        ),
    }
