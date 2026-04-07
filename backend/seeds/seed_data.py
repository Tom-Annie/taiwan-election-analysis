"""種子資料 — 台灣歷屆總統選舉真實數據 + 六都行政區"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import engine, SessionLocal, Base
from app.models import Election, Candidate, Region, RegionResult

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# ============================================================
# 行政區 (六都 + 其他直轄市/縣市)
# ============================================================
REGIONS = [
    ("TPE", "臺北市", "city", None, 2_495_000, 25.0330, 121.5654),
    ("NTC", "新北市", "city", None, 4_030_000, 25.0120, 121.4650),
    ("TAO", "桃園市", "city", None, 2_280_000, 24.9936, 121.3010),
    ("TXG", "臺中市", "city", None, 2_820_000, 24.1477, 120.6736),
    ("TNN", "臺南市", "city", None, 1_880_000, 22.9998, 120.2270),
    ("KHH", "高雄市", "city", None, 2_770_000, 22.6273, 120.3014),
    ("KLU", "基隆市", "city", None, 370_000, 25.1276, 121.7392),
    ("HSZ", "新竹市", "city", None, 450_000, 24.8138, 120.9675),
    ("HSQ", "新竹縣", "city", None, 570_000, 24.8390, 121.0177),
    ("MIA", "苗栗縣", "city", None, 550_000, 24.5602, 120.8214),
    ("CHA", "彰化縣", "city", None, 1_270_000, 24.0518, 120.5161),
    ("NAN", "南投縣", "city", None, 500_000, 23.9610, 120.9718),
    ("YLN", "雲林縣", "city", None, 690_000, 23.7092, 120.4313),
    ("CYI", "嘉義市", "city", None, 270_000, 23.4801, 120.4491),
    ("CYQ", "嘉義縣", "city", None, 510_000, 23.4518, 120.2551),
    ("PIF", "屏東縣", "city", None, 830_000, 22.5519, 120.5487),
    ("ILA", "宜蘭縣", "city", None, 455_000, 24.7570, 121.7533),
    ("HUA", "花蓮縣", "city", None, 330_000, 23.9910, 121.6011),
    ("TTT", "臺東縣", "city", None, 220_000, 22.7972, 121.0714),
    ("PEN", "澎湖縣", "city", None, 105_000, 23.5711, 119.5793),
    ("KMN", "金門縣", "city", None, 140_000, 24.4493, 118.3767),
    ("LIE", "連江縣", "city", None, 13_000, 26.1505, 119.9499),
]

for code, name, level, parent, pop, lat, lng in REGIONS:
    existing = db.query(Region).filter(Region.code == code).first()
    if not existing:
        db.add(Region(
            code=code, name=name, level=level,
            parent_code=parent, population=pop,
            latitude=lat, longitude=lng,
        ))
db.commit()

# ============================================================
# 歷屆總統選舉資料
# ============================================================
PRESIDENTIAL_ELECTIONS = [
    {
        "year": 1996, "name": "第9任總統副總統選舉", "date": "1996-03-23",
        "total_voters": 14_313_288, "total_votes": 10_883_279, "turnout": 76.04,
        "candidates": [
            (1, "陳履安", "中華新黨", "王清峰", 1_603_790, 14.90, 0),
            (2, "李登輝", "中國國民黨", "連戰", 5_813_699, 54.00, 1),
            (3, "彭明敏", "民主進步黨", "謝長廷", 2_274_586, 21.13, 0),
            (4, "林洋港", "無黨籍", "郝柏村", 1_603_790, 14.90, 0),
        ],
    },
    {
        "year": 2000, "name": "第10任總統副總統選舉", "date": "2000-03-18",
        "total_voters": 15_462_625, "total_votes": 12_786_671, "turnout": 82.69,
        "candidates": [
            (1, "連戰", "中國國民黨", "蕭萬長", 2_925_513, 23.10, 0),
            (2, "陳水扁", "民主進步黨", "呂秀蓮", 4_977_697, 39.30, 1),
            (3, "宋楚瑜", "親民黨", "張昭雄", 4_664_972, 36.84, 0),
            (4, "許信良", "無黨籍", "朱惠良", 79_429, 0.63, 0),
            (5, "李敖", "新黨", "馮滬祥", 16_782, 0.13, 0),
        ],
    },
    {
        "year": 2004, "name": "第11任總統副總統選舉", "date": "2004-03-20",
        "total_voters": 16_507_179, "total_votes": 13_251_719, "turnout": 80.28,
        "candidates": [
            (1, "陳水扁", "民主進步黨", "呂秀蓮", 6_471_970, 50.11, 1),
            (2, "連戰", "中國國民黨", "宋楚瑜", 6_442_452, 49.89, 0),
        ],
    },
    {
        "year": 2008, "name": "第12任總統副總統選舉", "date": "2008-03-22",
        "total_voters": 17_321_622, "total_votes": 13_221_609, "turnout": 76.33,
        "candidates": [
            (1, "謝長廷", "民主進步黨", "蘇貞昌", 5_444_949, 41.55, 0),
            (2, "馬英九", "中國國民黨", "蕭萬長", 7_659_014, 58.45, 1),
        ],
    },
    {
        "year": 2012, "name": "第13任總統副總統選舉", "date": "2012-01-14",
        "total_voters": 18_086_455, "total_votes": 13_452_016, "turnout": 74.38,
        "candidates": [
            (1, "蔡英文", "民主進步黨", "蘇嘉全", 6_093_578, 45.63, 0),
            (2, "馬英九", "中國國民黨", "吳敦義", 6_891_139, 51.60, 1),
            (3, "宋楚瑜", "親民黨", "林瑞雄", 369_588, 2.77, 0),
        ],
    },
    {
        "year": 2016, "name": "第14任總統副總統選舉", "date": "2016-01-16",
        "total_voters": 18_782_991, "total_votes": 12_448_302, "turnout": 66.27,
        "candidates": [
            (1, "朱立倫", "中國國民黨", "王如玄", 3_813_365, 31.04, 0),
            (2, "蔡英文", "民主進步黨", "陳建仁", 6_894_744, 56.12, 1),
            (3, "宋楚瑜", "親民黨", "徐欣瑩", 1_576_861, 12.84, 0),
        ],
    },
    {
        "year": 2020, "name": "第15任總統副總統選舉", "date": "2020-01-11",
        "total_voters": 19_311_105, "total_votes": 14_464_571, "turnout": 74.90,
        "candidates": [
            (1, "宋楚瑜", "親民黨", "余湘", 608_590, 4.26, 0),
            (2, "韓國瑜", "中國國民黨", "張善政", 5_522_119, 38.61, 0),
            (3, "蔡英文", "民主進步黨", "賴清德", 8_170_231, 57.13, 1),
        ],
    },
    {
        "year": 2024, "name": "第16任總統副總統選舉", "date": "2024-01-13",
        "total_voters": 19_548_531, "total_votes": 14_048_310, "turnout": 71.86,
        "candidates": [
            (1, "柯文哲", "台灣民眾黨", "吳欣盈", 3_690_466, 26.46, 0),
            (2, "賴清德", "民主進步黨", "蕭美琴", 5_586_019, 40.05, 1),
            (3, "侯友宜", "中國國民黨", "趙少康", 4_671_021, 33.49, 0),
        ],
    },
]

# 各縣市得票概略比例 (2024 為例，其他屆次按比例縮放)
# 格式: region_code -> (DPP比例, KMT比例, 其他比例) 大致分布
REGION_LEAN_2024 = {
    "TPE": (0.33, 0.40, 0.27), "NTC": (0.38, 0.36, 0.26),
    "TAO": (0.37, 0.37, 0.26), "TXG": (0.40, 0.34, 0.26),
    "TNN": (0.52, 0.27, 0.21), "KHH": (0.47, 0.30, 0.23),
    "KLU": (0.35, 0.38, 0.27), "HSZ": (0.35, 0.35, 0.30),
    "HSQ": (0.30, 0.42, 0.28), "MIA": (0.28, 0.45, 0.27),
    "CHA": (0.38, 0.38, 0.24), "NAN": (0.33, 0.42, 0.25),
    "YLN": (0.45, 0.33, 0.22), "CYI": (0.48, 0.30, 0.22),
    "CYQ": (0.48, 0.30, 0.22), "PIF": (0.52, 0.28, 0.20),
    "ILA": (0.45, 0.32, 0.23), "HUA": (0.30, 0.45, 0.25),
    "TTT": (0.32, 0.45, 0.23), "PEN": (0.40, 0.38, 0.22),
    "KMN": (0.10, 0.75, 0.15), "LIE": (0.12, 0.72, 0.16),
}


def seed_election(data: dict):
    existing = db.query(Election).filter(
        Election.year == data["year"],
        Election.type == "presidential",
    ).first()
    if existing:
        return

    election = Election(
        year=data["year"],
        type="presidential",
        name=data["name"],
        date=data["date"],
        total_voters=data["total_voters"],
        total_votes=data["total_votes"],
        turnout_rate=data["turnout"],
    )
    db.add(election)
    db.flush()

    candidates = []
    for num, name, party, vice, votes, rate, elected in data["candidates"]:
        c = Candidate(
            election_id=election.id,
            number=num,
            name=name,
            party=party,
            vice_name=vice,
            total_votes=votes,
            vote_rate=rate,
            elected=elected,
        )
        db.add(c)
        db.flush()
        candidates.append(c)

    # 為每個區域生成得票資料
    regions = db.query(Region).filter(Region.level == "city").all()
    for region in regions:
        lean = REGION_LEAN_2024.get(region.code, (0.40, 0.35, 0.25))
        region_total = int(data["total_votes"] * (region.population or 500_000) / 23_500_000)

        for c in candidates:
            if "民主進步黨" in (c.party or ""):
                base_rate = lean[0]
            elif "中國國民黨" in (c.party or ""):
                base_rate = lean[1]
            else:
                base_rate = lean[2] / max(len(candidates) - 2, 1)

            # Adjust: use candidate's national rate to weight
            national_rate = (c.vote_rate or 0) / 100
            adjusted = base_rate * 0.6 + national_rate * 0.4
            votes = int(region_total * adjusted)

            db.add(RegionResult(
                election_id=election.id,
                region_code=region.code,
                candidate_id=c.id,
                votes=votes,
                vote_rate=round(adjusted * 100, 2),
                turnout_rate=data["turnout"],
            ))

    db.commit()


for e_data in PRESIDENTIAL_ELECTIONS:
    seed_election(e_data)

db.close()
print("Seed data loaded successfully!")
print(f"  - {len(REGIONS)} regions")
print(f"  - {len(PRESIDENTIAL_ELECTIONS)} presidential elections")
