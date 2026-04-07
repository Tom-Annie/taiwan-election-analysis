import React, { useState } from "react";

const SECTIONS = [
  {
    id: "overview",
    title: "系統總覽",
    content: `
台灣選舉分析系統是一套整合歷史選舉資料、民調數據與預測模型的互動式分析平台。

**涵蓋資料：**
- 總統選舉：1996-2024 共 8 屆
- 縣市長選舉：2014、2018、2022 共 3 屆
- 立委選舉：2008-2024 共 5 屆
- 行政區：全台 22 縣市
- 民調資料：支援手動輸入與批次匯入

**核心功能：**
- Choropleth 地圖視覺化（三層模式切換）
- 2026 九合一選舉預測模型
- 民調管理與趨勢追蹤
- 國會版圖歷屆分析
- CSV 資料匯出
    `,
  },
  {
    id: "tabs",
    title: "各分頁功能說明",
    content: `
**總覽（Dashboard）**
系統首頁，一頁掌握關鍵數據：
- 統計摘要卡片（選舉屆數、候選人數、民調數量）
- 2026 預測席次圓餅圖
- 搖擺選區排名（勝率 < 65% 的關鍵戰場）
- 最新民調動態（優先顯示真實民調）
- 歷屆投票率趨勢折線圖
- 各縣市投票率排名（綠/黃/紅色階）
- 右上角可匯出 CSV

**地圖**
Choropleth 填色地圖，右上角切換三種模式：
- 選舉結果：依最近一屆選舉勝選政黨上色
- 最新民調：依最新民調領先政黨上色
- 2026預測：依預測勝選政黨上色，紅色虛線邊框表示「版圖翻轉」

hover 任一縣市可看到詳細數據，點擊可選取該縣市。

**國會**
立法院席次分析：
- 點擊年份切換屆次
- 左側：該屆圓餅圖 + 各黨席次卡片（標示是否過半）
- 右側：歷屆席次堆疊長條圖 + 三大黨面積趨勢圖

**民調**
各縣市民調總覽：
- 卡片模式顯示 22 縣市最新民調
- 點擊縣市進入詳情，查看歷次民調與趨勢折線
- 全縣市支持度橫向長條圖

**趨勢**
歷屆選舉得票率趨勢：
- 支援折線圖/長條圖切換
- 左側選擇縣市可查看該區域趨勢
- 選「全國」看全國政黨得票率變化

**比較**
跨屆跨區比較工具：
- 多選屆次（可複選）
- 多選縣市（可複選，空白=全部）
- 點擊「開始比較」產生橫向長條圖

**2026預測**
預測儀表板：
- 總覽模式：席次圓餅圖 + 搖擺選區 + 全縣市堆疊圖
- 詳情模式：點擊縣市看預測得票率、民調vs模型差距、歷史趨勢、模型參數
- 每個預測標示資料品質（真實民調/模擬民調/純歷史）

**管理**
民調資料管理後台：
- 左側選縣市 → 右側表單輸入新民調
- 支援編輯、刪除已有民調
- JSON 批次匯入功能
- 一鍵清除所有模擬資料
- 真實/模擬標記清楚區分
    `,
  },
  {
    id: "prediction",
    title: "預測模型說明",
    content: `
**模型架構**

預測模型融合三個訊號源，權重依資料品質動態調整：

| 情境 | 民調權重 | 歷史權重 | 基本盤權重 |
|------|---------|---------|-----------|
| 有真實民調 | 55% | 30% | 15% |
| 僅模擬民調 | 30% | 45% | 25% |
| 無民調     | 0%  | 60% | 40% |

**訊號源說明：**

1. **民調訊號**：取最近 3 筆民調加權平均（越新權重越高：50%/30%/20%），優先使用真實民調
2. **地方選舉歷史趨勢**：2022 權重 50%、2018 權重 30%、2014 權重 20%
3. **2024 總統選舉基本盤**：該區域各黨得票率作為政黨基本盤參考

**修正因子：**
- 在任者優勢：+1.5%（考量知名度與行政資源）

**輸出指標：**
- 各黨預測得票率（正規化至 100%）
- 勝選機率 = 50% + 領先差距 × 2.5
- 信心指數：依資料充足度計算（歷史屆數 + 民調數量）
- 民調 vs 模型差距：交叉比對兩者差異

**重要提醒：**
預測結果僅供參考分析，不代表實際選舉結果。模型會隨著真實民調的加入而持續修正。
    `,
  },
  {
    id: "data",
    title: "資料來源與品質",
    content: `
**選舉資料**
- 來源：中央選舉委員會歷屆選舉資料庫
- 涵蓋：總統（1996-2024）、縣市長（2014-2022）、立委（2008-2024）
- 各縣市得票數據為歷史真實數據

**民調資料**
系統內民調分為兩類：
- 🟢 **真實民調**：手動輸入的實際民調機構數據
- 🟡 **模擬民調**：系統初始化時基於歷史趨勢生成的模擬資料

辨別方式：
- 民調卡片上會標示「真實」或「模擬」標籤
- 管理頁面的列表中，模擬民調顯示為虛線框

**地圖資料**
- 台灣 22 縣市行政區邊界 GeoJSON
- 來源：g0v 開放資料（簡化版，約 880KB）

**建議操作：**
1. 進入「管理」分頁
2. 點擊「清除模擬資料」移除所有模擬民調
3. 手動輸入各家媒體/機構的真實民調
4. 預測模型會自動使用真實民調並提升信心度
    `,
  },
  {
    id: "admin",
    title: "民調管理操作指南",
    content: `
**新增單筆民調**

1. 進入「管理」分頁
2. 左側選擇縣市
3. 填寫：日期、民調機構、樣本數、誤差
4. 輸入各政黨支持率（可留空不填的政黨）
5. 點擊「新增」

**JSON 批次匯入**

點擊右上角「JSON 批次匯入」，貼上 JSON 格式資料：

\`\`\`json
[
  {
    "region_code": "TPE",
    "date": "2026-04-08",
    "source": "TVBS民調中心",
    "sample_size": 1012,
    "margin_of_error": 3.1,
    "items": [
      {"party": "中國國民黨", "candidate_name": "蔣萬安", "support_rate": 40.5},
      {"party": "民主進步黨", "support_rate": 28.2},
      {"party": "台灣民眾黨", "support_rate": 18.5}
    ]
  }
]
\`\`\`

**縣市代碼對照：**

| 代碼 | 縣市 | 代碼 | 縣市 | 代碼 | 縣市 |
|------|------|------|------|------|------|
| TPE | 臺北市 | NTC | 新北市 | TAO | 桃園市 |
| TXG | 臺中市 | TNN | 臺南市 | KHH | 高雄市 |
| KLU | 基隆市 | HSZ | 新竹市 | HSQ | 新竹縣 |
| MIA | 苗栗縣 | CHA | 彰化縣 | NAN | 南投縣 |
| YLN | 雲林縣 | CYI | 嘉義市 | CYQ | 嘉義縣 |
| PIF | 屏東縣 | ILA | 宜蘭縣 | HUA | 花蓮縣 |
| TTT | 臺東縣 | PEN | 澎湖縣 | KMN | 金門縣 |
| LIE | 連江縣 |     |       |     |       |

**CSV 匯出**

在「總覽」分頁右上角：
- 「匯出預測 CSV」：下載 22 縣市預測結果
- 「匯出民調 CSV」：下載所有民調原始資料
    `,
  },
  {
    id: "api",
    title: "API 端點文件",
    content: `
後端 API 執行於 \`http://localhost:8000\`，完整 Swagger 文件請訪問 \`/docs\`。

**選舉資料**
- \`GET /api/elections/\` — 選舉列表（可篩 year, type）
- \`GET /api/elections/{id}\` — 選舉詳情含候選人
- \`GET /api/elections/{id}/results\` — 各區域得票結果
- \`GET /api/elections/parties/trend\` — 政黨歷屆得票率

**區域**
- \`GET /api/regions/\` — 區域列表
- \`GET /api/regions/{code}/history\` — 特定區域歷屆結果

**民調**
- \`GET /api/polls/summary\` — 各縣市最新民調摘要
- \`GET /api/polls/{code}/trend\` — 民調趨勢
- \`POST /api/polls/\` — 新增民調
- \`POST /api/polls/bulk\` — 批次匯入
- \`PUT /api/polls/{id}\` — 更新民調
- \`DELETE /api/polls/{id}\` — 刪除民調
- \`DELETE /api/polls/simulated/all\` — 清除模擬資料

**預測**
- \`GET /api/predictions/\` — 全縣市預測
- \`GET /api/predictions/summary\` — 預測總覽
- \`GET /api/predictions/{code}\` — 單一縣市預測

**國會**
- \`GET /api/legislative/seats\` — 歷屆席次
- \`GET /api/legislative/trend\` — 席次趨勢

**儀表板**
- \`GET /api/dashboard/\` — 首頁聚合資料
- \`GET /api/dashboard/export/predictions\` — 匯出預測 CSV
- \`GET /api/dashboard/export/polls\` — 匯出民調 CSV

**比較**
- \`POST /api/compare/\` — 跨屆跨區比較
    `,
  },
];

// Simple markdown-ish renderer
function renderContent(text) {
  const lines = text.trim().split("\n");
  const elements = [];
  let inTable = false;
  let tableRows = [];
  let inCode = false;
  let codeLines = [];

  const flushTable = () => {
    if (tableRows.length < 2) return;
    const headers = tableRows[0].split("|").filter(Boolean).map((h) => h.trim());
    const dataRows = tableRows.slice(2); // skip separator
    elements.push(
      <div key={`tbl-${elements.length}`} style={{ overflowX: "auto", marginBottom: "12px" }}>
        <table style={tblStyles.table}>
          <thead>
            <tr>{headers.map((h, i) => <th key={i} style={tblStyles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => {
              const cells = row.split("|").filter(Boolean).map((c) => c.trim());
              return (
                <tr key={ri}>
                  {cells.map((c, ci) => <td key={ci} style={tblStyles.td}>{c}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  const flushCode = () => {
    elements.push(
      <pre key={`code-${elements.length}`} style={s.codeBlock}>
        {codeLines.join("\n")}
      </pre>
    );
    codeLines = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) { inCode = false; flushCode(); }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (line.trim().startsWith("|")) {
      if (!inTable) inTable = true;
      tableRows.push(line);
      continue;
    } else if (inTable) {
      inTable = false;
      flushTable();
    }

    const trimmed = line.trim();
    if (!trimmed) { elements.push(<br key={`br-${elements.length}`} />); continue; }

    // Format inline
    const formatted = trimmed
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:1px 5px;border-radius:3px;font-size:0.85em">$1</code>');

    if (trimmed.startsWith("- ")) {
      elements.push(
        <div key={`li-${elements.length}`} style={s.listItem}
          dangerouslySetInnerHTML={{ __html: "• " + formatted.slice(2) }} />
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      elements.push(
        <div key={`ol-${elements.length}`} style={s.listItem}
          dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    } else {
      elements.push(
        <p key={`p-${elements.length}`} style={s.paragraph}
          dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    }
  }
  if (inTable) flushTable();
  if (inCode) flushCode();

  return elements;
}

export default function HelpGuide() {
  const [activeSection, setActiveSection] = useState("overview");

  const section = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>使用說明</h2>
        <p style={s.subtitle}>台灣選舉分析系統操作手冊</p>
      </div>

      <div style={s.body}>
        {/* Left nav */}
        <nav style={s.nav}>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              style={{
                ...s.navItem,
                ...(activeSection === sec.id ? s.navItemActive : {}),
              }}
            >
              {sec.title}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={s.content}>
          <h3 style={s.contentTitle}>{section?.title}</h3>
          <div style={s.contentBody}>
            {section && renderContent(section.content)}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { backgroundColor: "#fff", borderRadius: "12px", padding: "20px" },
  header: { marginBottom: "16px" },
  title: { margin: 0, fontSize: "1.2rem" },
  subtitle: { margin: "4px 0 0", fontSize: "0.8rem", color: "#888" },
  body: { display: "flex", gap: "20px", minHeight: "500px" },
  nav: {
    width: "180px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "2px",
  },
  navItem: {
    padding: "10px 14px", borderRadius: "8px", border: "none",
    backgroundColor: "transparent", cursor: "pointer",
    fontSize: "0.85rem", textAlign: "left", color: "#555",
    transition: "all 0.15s",
  },
  navItemActive: {
    backgroundColor: "#e8f0fe", color: "#1a1a2e", fontWeight: "bold",
  },
  content: {
    flex: 1, padding: "0 10px", overflowY: "auto", maxHeight: "70vh",
  },
  contentTitle: { margin: "0 0 16px", fontSize: "1.1rem", borderBottom: "2px solid #eee", paddingBottom: "8px" },
  contentBody: { lineHeight: 1.7, fontSize: "0.9rem", color: "#333" },
  paragraph: { margin: "0 0 8px" },
  listItem: { margin: "0 0 4px", paddingLeft: "8px" },
  codeBlock: {
    backgroundColor: "#1a1a2e", color: "#e0e0e0", padding: "14px",
    borderRadius: "8px", fontSize: "0.8rem", overflow: "auto",
    margin: "8px 0 12px", lineHeight: 1.5,
  },
};

const tblStyles = {
  table: {
    borderCollapse: "collapse", width: "100%", fontSize: "0.82rem",
    margin: "4px 0",
  },
  th: {
    padding: "8px 12px", backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6",
    textAlign: "left", fontWeight: "bold",
  },
  td: {
    padding: "6px 12px", borderBottom: "1px solid #eee",
  },
};
