# 台灣選舉分析系統 — 架構文件

## 專案結構

```
taiwan-election-analysis/
├── backend/                  # FastAPI 後端
│   ├── app/
│   │   ├── main.py          # FastAPI 入口，CORS 設定
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── models.py        # ORM models (Election, Candidate, Region, RegionResult)
│   │   ├── schemas.py       # Pydantic response schemas
│   │   ├── routers/
│   │   │   ├── elections.py # /api/elections — 選舉列表、詳情、結果、政黨趨勢
│   │   │   ├── regions.py   # /api/regions — 區域列表、歷史趨勢
│   │   │   └── compare.py   # /api/compare — 跨屆跨區比較
│   │   └── services/
│   │       └── analysis.py  # 搖擺區分析、投票率趨勢
│   ├── seeds/
│   │   └── seed_data.py     # 種子資料 (1996-2024 總統選舉)
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
│   │       ├── TrendChart.jsx   # Recharts 折線/長條圖
│   │       └── ComparePanel.jsx # 跨屆比較面板
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

## 技術選型

- **DB**: SQLite（開發）→ PostgreSQL + PostGIS（正式）
- **後端**: Python 3.12 + FastAPI + SQLAlchemy 2.0
- **前端**: React 18 + Vite + Recharts + React-Leaflet
- **部署**: Docker Compose
