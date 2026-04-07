"""預測服務 — 2026 縣市長選舉預測模型 v2

三層訊號源：
1. 民調（有真實民調時權重最高）
2. 歷屆地方選舉趨勢
3. 2024 總統選舉基本盤

權重動態調整：有民調 → 民調主導；無民調 → 回退歷史模型
"""

from sqlalchemy.orm import Session
from .. import models
import numpy as np


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

MAJOR_PARTIES = ["民主進步黨", "中國國民黨", "台灣民眾黨"]


def _get_local_party_rates(db: Session, region_code: str) -> dict[int, dict[str, float]]:
    """歷屆地方選舉各黨得票率"""
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
    """2024 總統大選各黨得票率"""
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
    return {
        (r.candidate.party or "無黨籍"): (r.vote_rate or 0)
        for r in results if r.candidate
    }


def _get_poll_rates(db: Session, region_code: str) -> tuple[dict[str, float], int, bool]:
    """取得該區最新民調支持率（優先真實民調）

    Returns: (party_rates, poll_count, has_real)
    """
    # 真實民調優先
    real_polls = (
        db.query(models.Poll)
        .filter(
            models.Poll.region_code == region_code,
            models.Poll.is_simulated == 0,
        )
        .order_by(models.Poll.date.desc())
        .limit(3)
        .all()
    )

    if real_polls:
        polls = real_polls
        has_real = True
    else:
        polls = (
            db.query(models.Poll)
            .filter(models.Poll.region_code == region_code)
            .order_by(models.Poll.date.desc())
            .limit(3)
            .all()
        )
        has_real = False

    if not polls:
        return {}, 0, False

    # 加權平均最近 N 筆民調（越新權重越高）
    weights = [0.5, 0.3, 0.2][:len(polls)]
    party_rates = {}
    weight_total = sum(weights)

    for poll, w in zip(polls, weights):
        for item in poll.items:
            party = item.party
            if party not in party_rates:
                party_rates[party] = 0
            party_rates[party] += item.support_rate * w / weight_total

    return party_rates, len(polls), has_real


def _compute_historical_score(
    local_history: dict, pres_base: dict, party: str
) -> float:
    """純歷史模型分數"""
    weights = {2022: 0.50, 2018: 0.30, 2014: 0.20}
    weighted_sum = 0
    weight_total = 0
    for year, w in weights.items():
        if year in local_history and party in local_history[year]:
            weighted_sum += local_history[year][party] * w
            weight_total += w

    local_trend = weighted_sum / weight_total if weight_total > 0 else 0
    pres_rate = pres_base.get(party, 0)

    # 地方趨勢 60% + 總統基本盤 40%
    return local_trend * 0.6 + pres_rate * 0.4


def predict_region(db: Session, region_code: str) -> dict:
    """預測單一縣市"""
    region = db.query(models.Region).filter(models.Region.code == region_code).first()
    if not region:
        return None

    local_history = _get_local_party_rates(db, region_code)
    pres_base = _get_presidential_base(db, region_code)
    incumbent = INCUMBENTS_2022.get(region_code)
    poll_rates, poll_count, has_real_polls = _get_poll_rates(db, region_code)

    # 動態權重：有真實民調 → 民調 55%, 歷史 30%, 基本盤 15%
    #           有模擬民調 → 民調 30%, 歷史 45%, 基本盤 25%
    #           無民調     → 歷史 60%, 基本盤 40%
    if has_real_polls:
        w_poll, w_hist, w_pres = 0.55, 0.30, 0.15
        data_quality = "real_polls"
    elif poll_count > 0:
        w_poll, w_hist, w_pres = 0.30, 0.45, 0.25
        data_quality = "simulated_polls"
    else:
        w_poll, w_hist, w_pres = 0.0, 0.60, 0.40
        data_quality = "history_only"

    party_scores = {}

    for party in MAJOR_PARTIES:
        hist_score = _compute_historical_score(local_history, pres_base, party)
        poll_score = poll_rates.get(party, 0)
        pres_score = pres_base.get(party, 0)

        # 加權組合
        if w_poll > 0 and poll_score > 0:
            base_score = poll_score * w_poll + hist_score * w_hist + pres_score * w_pres
        else:
            base_score = hist_score * (w_hist + w_poll) + pres_score * w_pres

        # 在任者效應 (縮小)
        if incumbent and incumbent[1] == party:
            base_score += 1.5

        party_scores[party] = max(base_score, 1.0)

    # 其他/無黨籍
    other_from_poll = sum(
        v for k, v in poll_rates.items()
        if k not in MAJOR_PARTIES and k != "未決定"
    )
    other_rate = max(other_from_poll, max(100 - sum(party_scores.values()), 3.0))
    party_scores["其他/無黨籍"] = other_rate

    # 正規化
    total = sum(party_scores.values())
    for party in party_scores:
        party_scores[party] = round(party_scores[party] / total * 100, 1)

    # 信心指數
    history_points = sum(1 for y in [2014, 2018, 2022] if y in local_history)
    base_confidence = history_points * 15 + (15 if pres_base else 0)
    if has_real_polls:
        base_confidence += poll_count * 15  # 真實民調大幅提升信心
    elif poll_count > 0:
        base_confidence += poll_count * 5   # 模擬民調小幅提升
    confidence = min(round(base_confidence + 10, 1), 95.0)

    # 勝選判定
    predicted_winner_party = max(
        [p for p in MAJOR_PARTIES if p in party_scores],
        key=lambda p: party_scores.get(p, 0),
    )

    # 勝選機率
    sorted_parties = sorted(party_scores.items(), key=lambda x: -x[1])
    if len(sorted_parties) >= 2:
        gap = sorted_parties[0][1] - sorted_parties[1][1]
        win_probability = min(50 + gap * 2.5, 95.0)
    else:
        win_probability = 70.0

    # 民調 vs 模型差距
    poll_vs_model = {}
    if poll_rates:
        for party in MAJOR_PARTIES:
            p_rate = poll_rates.get(party, 0)
            m_rate = party_scores.get(party, 0)
            if p_rate > 0:
                poll_vs_model[party] = {
                    "poll": round(p_rate, 1),
                    "model": m_rate,
                    "diff": round(m_rate - p_rate, 1),
                }

    # 歷史趨勢
    trend = [
        {"year": y, "parties": local_history[y]}
        for y in sorted(local_history.keys())
    ]

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
        "data_quality": data_quality,
        "poll_count": poll_count,
        "has_real_polls": has_real_polls,
        "poll_vs_model": poll_vs_model,
        "factors": {
            "poll_weight": w_poll,
            "history_weight": w_hist,
            "presidential_weight": w_pres,
            "incumbency_bonus": 1.5,
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
    """預測總覽"""
    all_preds = predict_all(db)

    party_seats = {}
    party_regions = {}
    for pred in all_preds:
        winner = pred["predicted_winner"]
        party_seats[winner] = party_seats.get(winner, 0) + 1
        if winner not in party_regions:
            party_regions[winner] = []
        party_regions[winner].append(pred["region_name"])

    battlegrounds = [p for p in all_preds if p["win_probability"] < 65]
    battlegrounds.sort(key=lambda x: x["win_probability"])

    # 資料品質統計
    quality_stats = {
        "real_polls": sum(1 for p in all_preds if p["data_quality"] == "real_polls"),
        "simulated_polls": sum(1 for p in all_preds if p["data_quality"] == "simulated_polls"),
        "history_only": sum(1 for p in all_preds if p["data_quality"] == "history_only"),
    }

    return {
        "prediction_year": 2026,
        "total_seats": len(all_preds),
        "party_seats": party_seats,
        "party_regions": party_regions,
        "battlegrounds": battlegrounds[:8],
        "avg_confidence": round(np.mean([p["confidence"] for p in all_preds]), 1),
        "data_quality": quality_stats,
    }
