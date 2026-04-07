"""種子資料 — 2026 縣市長選舉民調 (模擬資料)

注意：以下為基於歷史趨勢模擬的民調資料，非真實民調結果。
實際使用時應接入真實民調來源。
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import engine, SessionLocal, Base
from app.models import Poll, PollItem

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# 各縣市模擬民調資料
# 格式: region_code -> list of polls
# 每筆 poll: (date, source, sample_size, margin_of_error, [(candidate, party, rate)])
POLL_DATA = {
    "TPE": [
        ("2026-03-15", "TVBS民調中心", 1012, 3.1, [
            ("蔣萬安", "中國國民黨", 38.2),
            (None, "民主進步黨", 28.5),
            (None, "台灣民眾黨", 18.7),
            (None, "未決定", None),
        ]),
        ("2026-03-28", "聯合報系民調", 1085, 3.0, [
            ("蔣萬安", "中國國民黨", 39.5),
            (None, "民主進步黨", 27.1),
            (None, "台灣民眾黨", 19.2),
            (None, "未決定", None),
        ]),
        ("2026-04-05", "美麗島電子報", 1073, 3.0, [
            ("蔣萬安", "中國國民黨", 40.1),
            (None, "民主進步黨", 26.8),
            (None, "台灣民眾黨", 20.3),
            (None, "未決定", None),
        ]),
    ],
    "NTC": [
        ("2026-03-20", "TVBS民調中心", 1008, 3.1, [
            (None, "中國國民黨", 36.8),
            (None, "民主進步黨", 32.5),
            (None, "台灣民眾黨", 15.2),
            (None, "未決定", None),
        ]),
        ("2026-04-02", "ETtoday民調雲", 1102, 2.9, [
            (None, "中國國民黨", 35.4),
            (None, "民主進步黨", 33.8),
            (None, "台灣民眾黨", 16.1),
            (None, "未決定", None),
        ]),
    ],
    "TAO": [
        ("2026-03-18", "聯合報系民調", 1005, 3.1, [
            (None, "中國國民黨", 35.2),
            (None, "民主進步黨", 34.1),
            (None, "台灣民眾黨", 16.5),
            (None, "未決定", None),
        ]),
        ("2026-04-01", "台灣民意基金會", 1080, 3.0, [
            (None, "中國國民黨", 34.8),
            (None, "民主進步黨", 35.2),
            (None, "台灣民眾黨", 16.8),
            (None, "未決定", None),
        ]),
    ],
    "TXG": [
        ("2026-03-22", "TVBS民調中心", 1015, 3.1, [
            ("盧秀燕", "中國國民黨", 48.5),
            (None, "民主進步黨", 25.2),
            (None, "台灣民眾黨", 14.3),
            (None, "未決定", None),
        ]),
        ("2026-04-03", "美麗島電子報", 1068, 3.0, [
            ("盧秀燕", "中國國民黨", 49.2),
            (None, "民主進步黨", 24.8),
            (None, "台灣民眾黨", 15.1),
            (None, "未決定", None),
        ]),
    ],
    "TNN": [
        ("2026-03-25", "台灣民意基金會", 1020, 3.1, [
            (None, "民主進步黨", 40.5),
            (None, "中國國民黨", 28.2),
            (None, "台灣民眾黨", 12.8),
            (None, "未決定", None),
        ]),
        ("2026-04-04", "TVBS民調中心", 1055, 3.0, [
            (None, "民主進步黨", 41.2),
            (None, "中國國民黨", 27.5),
            (None, "台灣民眾黨", 13.5),
            (None, "未決定", None),
        ]),
    ],
    "KHH": [
        ("2026-03-20", "聯合報系民調", 1010, 3.1, [
            ("陳其邁", "民主進步黨", 44.8),
            (None, "中國國民黨", 26.5),
            (None, "台灣民眾黨", 13.2),
            (None, "未決定", None),
        ]),
        ("2026-04-06", "美麗島電子報", 1090, 2.9, [
            ("陳其邁", "民主進步黨", 45.5),
            (None, "中國國民黨", 25.8),
            (None, "台灣民眾黨", 14.0),
            (None, "未決定", None),
        ]),
    ],
    "KLU": [
        ("2026-03-28", "ETtoday民調雲", 805, 3.5, [
            (None, "中國國民黨", 37.5),
            (None, "民主進步黨", 30.2),
            (None, "台灣民眾黨", 14.8),
            (None, "未決定", None),
        ]),
    ],
    "HSZ": [
        ("2026-03-30", "TVBS民調中心", 812, 3.4, [
            (None, "台灣民眾黨", 30.5),
            (None, "民主進步黨", 28.2),
            (None, "中國國民黨", 25.8),
            (None, "未決定", None),
        ]),
    ],
    "HSQ": [
        ("2026-03-25", "聯合報系民調", 808, 3.4, [
            (None, "中國國民黨", 42.5),
            (None, "民主進步黨", 28.8),
            (None, "台灣民眾黨", 13.2),
            (None, "未決定", None),
        ]),
    ],
    "MIA": [
        ("2026-03-22", "ETtoday民調雲", 805, 3.5, [
            (None, "中國國民黨", 38.2),
            (None, "民主進步黨", 30.5),
            (None, "無黨籍", 18.5),
            (None, "未決定", None),
        ]),
    ],
    "CHA": [
        ("2026-04-01", "台灣民意基金會", 820, 3.4, [
            (None, "中國國民黨", 39.8),
            (None, "民主進步黨", 35.2),
            (None, "台灣民眾黨", 11.5),
            (None, "未決定", None),
        ]),
    ],
    "NAN": [
        ("2026-03-28", "TVBS民調中心", 802, 3.5, [
            (None, "中國國民黨", 41.2),
            (None, "民主進步黨", 31.5),
            (None, "台灣民眾黨", 12.0),
            (None, "未決定", None),
        ]),
    ],
    "YLN": [
        ("2026-04-02", "美麗島電子報", 810, 3.4, [
            (None, "中國國民黨", 38.5),
            (None, "民主進步黨", 36.8),
            (None, "台灣民眾黨", 10.2),
            (None, "未決定", None),
        ]),
    ],
    "CYI": [
        ("2026-03-30", "聯合報系民調", 805, 3.5, [
            (None, "中國國民黨", 40.5),
            (None, "民主進步黨", 35.2),
            (None, "台灣民眾黨", 10.8),
            (None, "未決定", None),
        ]),
    ],
    "CYQ": [
        ("2026-04-03", "台灣民意基金會", 815, 3.4, [
            (None, "民主進步黨", 45.2),
            (None, "中國國民黨", 30.8),
            (None, "台灣民眾黨", 9.5),
            (None, "未決定", None),
        ]),
    ],
    "PIF": [
        ("2026-03-25", "TVBS民調中心", 808, 3.5, [
            (None, "民主進步黨", 48.5),
            (None, "中國國民黨", 25.2),
            (None, "台灣民眾黨", 10.8),
            (None, "未決定", None),
        ]),
    ],
    "ILA": [
        ("2026-04-01", "ETtoday民調雲", 803, 3.5, [
            (None, "中國國民黨", 36.2),
            (None, "民主進步黨", 35.8),
            (None, "台灣民眾黨", 13.5),
            (None, "未決定", None),
        ]),
    ],
    "HUA": [
        ("2026-03-28", "聯合報系民調", 800, 3.5, [
            (None, "中國國民黨", 45.8),
            (None, "民主進步黨", 22.5),
            (None, "台灣民眾黨", 12.2),
            (None, "未決定", None),
        ]),
    ],
    "TTT": [
        ("2026-03-30", "TVBS民調中心", 802, 3.5, [
            (None, "中國國民黨", 44.5),
            (None, "民主進步黨", 28.2),
            (None, "台灣民眾黨", 11.5),
            (None, "未決定", None),
        ]),
    ],
    "PEN": [
        ("2026-04-02", "美麗島電子報", 605, 4.0, [
            (None, "民主進步黨", 38.5),
            (None, "中國國民黨", 37.2),
            (None, "台灣民眾黨", 10.5),
            (None, "未決定", None),
        ]),
    ],
    "KMN": [
        ("2026-03-25", "聯合報系民調", 502, 4.4, [
            (None, "中國國民黨", 52.5),
            (None, "無黨籍", 28.2),
            (None, "民主進步黨", 8.5),
            (None, "未決定", None),
        ]),
    ],
    "LIE": [
        ("2026-03-20", "ETtoday民調雲", 305, 5.6, [
            (None, "中國國民黨", 50.2),
            (None, "無黨籍", 25.5),
            (None, "民主進步黨", 10.8),
            (None, "未決定", None),
        ]),
    ],
}


def seed_polls():
    # 清除舊民調
    db.query(PollItem).delete()
    db.query(Poll).delete()
    db.commit()

    total_polls = 0
    for region_code, polls in POLL_DATA.items():
        for date, source, sample, moe, items in polls:
            poll = Poll(
                region_code=region_code,
                election_type="local",
                date=date,
                source=source,
                sample_size=sample,
                margin_of_error=moe,
            )
            db.add(poll)
            db.flush()

            for candidate_name, party, rate in items:
                if party == "未決定":
                    continue
                db.add(PollItem(
                    poll_id=poll.id,
                    candidate_name=candidate_name,
                    party=party,
                    support_rate=rate,
                ))
            total_polls += 1

    db.commit()
    print(f"Seeded {total_polls} polls across {len(POLL_DATA)} regions")


seed_polls()
db.close()
