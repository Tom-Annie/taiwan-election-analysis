# 台灣選舉分析系統 — 架構文件

## 專案結構

```
taiwan-election-analysis/
├── backend/                  # FastAPI 後端
│   ├── app/
│   │   ├── main.py          # FastAPI 入口，CORS 設定
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── models.py        # ORM models (Election, Candidate, Region, RegionResult, Poll, PollItem)
│   │   ├── schemas.py       # Pydantic response schemas
│   │   ├── routers/
│   │   │   ├── elections.py # /api/elections — 選舉列表、詳情、結果、政黨趨勢
│   │   │   ├── regions.py   # /api/regions — 區域列表、歷史趨勢
│   │   │   └── compare.py   # /api/compare — 跨屆跨區比較
│   │   │   ├── prediction.py # /api/predictions — 2026 選舉預測
│   │   │   └── polls.py     # /api/polls — 民調資料
│   │   └── services/
│   │       ├── analysis.py  # 搖擺區分析、投票率趨勢
│   │       └── prediction.py # 預測模型（加權趨勢+鐘擺+在任者效應）
│   ├── seeds/
│   │   ├── seed_data.py     # 種子資料 (1996-2024 總統選舉)
│   │   ├── seed_mayoral.py  # 2014/2018/2022 縣市長選舉
│   │   └── seed_polls.py   # 2026 模擬民調資料
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx          # 主佈局：header + sidebar + main content
│   │   ├── main.jsx         # React 入口
│   │   ├── api/client.js    # Axios API client
│   │   └── components/
│   │       ├── Sidebar.jsx      # 選舉/區域選擇 + 候選人結果
│   │       ├── ElectionMap.jsx  # Leaflet 地圖（圓點標記）
│   │       ├── TrendChart.jsx       # Recharts 折線/長條圖
│   │       ├── ComparePanel.jsx    # 跨屆比較面板
│   │       ├── PredictionPanel.jsx # 2026 預測儀表板
│   │       └── PollPanel.jsx       # 民調總覽+詳情+趨勢
│   ├── public/
│   │   └── tw-counties.json        # 台灣 22 縣市 GeoJSON 邊界
│   ├── package.json
│   ├── vite.config.js       # dev proxy -> backend:8000
│   └── Dockerfile
├── docker-compose.yml
└── ARCHITECTURE.md
```

## 資料模型

- **Election**: 選舉基本資料（年份、類型、投票率）
- **Candidate**: 候選人（姓名、政黨、得票數、是否當選）
- **Region**: 行政區（代碼、名稱、層級、經緯度）
- **RegionResult**: 各區域各候選人得票結果
- **Poll**: 民調基本資料（區域、日期、機構、樣本數、誤差）
- **PollItem**: 民調各黨/候選人支持率

## API 端點

| Method | Path | 說明 |
|--------|------|------|
| GET | /api/elections/ | 選舉列表（可篩 year, type） |
| GET | /api/elections/:id | 選舉詳情含候選人 |
| GET | /api/elections/:id/results | 各區域得票結果 |
| GET | /api/elections/parties/trend | 政黨歷屆得票率趨勢 |
| GET | /api/regions/ | 區域列表 |
| GET | /api/regions/:code/history | 特定區域歷屆結果 |
| POST | /api/compare/ | 跨屆跨區比較 |
| GET | /api/predictions/ | 全縣市 2026 預測 |
| GET | /api/predictions/summary | 預測總覽（席次、搖擺區） |
| GET | /api/predictions/:code | 單一縣市預測詳情 |
| GET | /api/polls/ | 民調列表（可篩 region_code） |
| GET | /api/polls/summary | 各縣市最新民調摘要 |
| GET | /api/polls/:code | 特定縣市所有民調 |
| GET | /api/polls/:code/trend | 特定縣市民調趨勢 |

## 技術選型

- **DB**: SQLite（開發）→ PostgreSQL + PostGIS（正式）
- **後端**: Python 3.12 + FastAPI + SQLAlchemy 2.0
- **前端**: React 18 + Vite + Recharts + React-Leaflet
- **部署**: Docker Compose

## 預測模型

2026 九合一縣市長選舉預測，使用以下加權模型：

- **地方選舉歷史趨勢** (60%): 2022 權重 50%, 2018 權重 30%, 2014 權重 20%
- **2024 總統選舉基本盤** (40%): 各區域政黨得票率
- **修正因子**:
  - 執政黨鐘擺效應: -2.5% (中央執政的民進黨)
  - 在任者優勢: +2.0%
  - 民眾黨成長修正: +1.5%
- 輸出: 各黨預測得票率、勝選機率、信心指數
