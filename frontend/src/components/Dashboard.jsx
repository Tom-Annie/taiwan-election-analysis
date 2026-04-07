import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
  ResponsiveContainer,
} from "recharts";
import { getDashboard } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  親民黨: "#FF6310",
  "其他/無黨籍": "#999",
};
const PARTY_SHORT = {
  民主進步黨: "民進黨",
  中國國民黨: "國民黨",
  台灣民眾黨: "民眾黨",
  "其他/無黨籍": "其他",
};

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getDashboard().then(setData).catch(console.error);
  }, []);

  if (!data) return <div style={{ padding: 40, color: "#888" }}>載入中...</div>;

  const { prediction, recent_polls, turnout_trend, region_turnout, stats } = data;

  const seatData = Object.entries(prediction.party_seats).map(([party, seats]) => ({
    name: PARTY_SHORT[party] || party,
    value: seats,
    fill: PARTY_COLORS[party] || "#999",
  }));

  const turnoutByType = {};
  for (const t of turnout_trend) {
    const label = t.type === "presidential" ? "總統" : t.type === "local" ? "地方" : t.type;
    if (!turnoutByType[label]) turnoutByType[label] = [];
    turnoutByType[label].push({ year: t.year, rate: t.turnout_rate });
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>選舉分析儀表板</h2>
        <div style={styles.exportBtns}>
          <a href="/api/dashboard/export/predictions" style={styles.exportBtn}>匯出預測 CSV</a>
          <a href="/api/dashboard/export/polls" style={styles.exportBtn}>匯出民調 CSV</a>
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: "選舉資料", value: stats.total_elections, sub: "屆" },
          { label: "候選人", value: stats.total_candidates, sub: "人" },
          { label: "縣市", value: stats.total_regions, sub: "個" },
          { label: "民調", value: stats.total_polls, sub: `(${stats.real_polls} 真實)` },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label} {s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={styles.grid}>
        {/* 2026 Prediction summary */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>2026 預測席次</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={seatData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} label={({ name, value }) => `${name} ${value}`}>
                {seatData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={styles.qualityRow}>
            <span style={styles.qualityBadge}>
              真實民調: {prediction.data_quality?.real_polls || 0}
            </span>
            <span style={{ ...styles.qualityBadge, backgroundColor: "#fff3cd", color: "#856404" }}>
              模擬: {prediction.data_quality?.simulated_polls || 0}
            </span>
            <span style={{ ...styles.qualityBadge, backgroundColor: "#f8d7da", color: "#721c24" }}>
              純歷史: {prediction.data_quality?.history_only || 0}
            </span>
          </div>
        </div>

        {/* Battlegrounds */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>關鍵搖擺選區</h3>
          {prediction.battlegrounds?.slice(0, 6).map((b) => (
            <div key={b.region_code} style={styles.battleRow}>
              <span style={styles.battleName}>{b.region_name}</span>
              <span style={{
                color: PARTY_COLORS[b.predicted_winner] || "#999",
                fontWeight: "bold", fontSize: "0.85rem",
              }}>
                {PARTY_SHORT[b.predicted_winner]}
              </span>
              <div style={styles.miniBar}>
                <div style={{
                  width: `${b.win_probability}%`, height: "100%",
                  backgroundColor: PARTY_COLORS[b.predicted_winner] || "#999",
                  borderRadius: "3px",
                }} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "#888", width: "40px", textAlign: "right" }}>
                {b.win_probability}%
              </span>
            </div>
          ))}
        </div>

        {/* Recent polls feed */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>最新民調動態</h3>
          {recent_polls.map((p, i) => (
            <div key={i} style={styles.pollFeedItem}>
              <div style={styles.feedHeader}>
                <strong>{p.region_name}</strong>
                <span style={{ color: "#888", fontSize: "0.8rem" }}>{p.date}</span>
                {p.is_simulated ? (
                  <span style={styles.simBadge}>模擬</span>
                ) : (
                  <span style={styles.realBadge}>真實</span>
                )}
              </div>
              <div style={styles.feedSource}>{p.source}</div>
              <div style={styles.feedParties}>
                {p.items?.slice(0, 3).map((it, j) => (
                  <span key={j} style={{
                    color: PARTY_COLORS[it.party] || "#999",
                    fontSize: "0.8rem", marginRight: "10px",
                  }}>
                    {PARTY_SHORT[it.party] || it.party} <b>{it.rate}%</b>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Turnout trend */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>歷屆投票率趨勢</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]}
                allowDuplicatedCategory={false} />
              <YAxis unit="%" domain={[50, 90]} />
              <Tooltip formatter={(v) => `${v?.toFixed(1)}%`} />
              <Legend />
              {Object.entries(turnoutByType).map(([label, d], i) => (
                <Line key={label} data={d} dataKey="rate" name={label}
                  stroke={["#e74c3c", "#3498db", "#f39c12"][i % 3]}
                  strokeWidth={2} dot={{ r: 4 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Region turnout ranking */}
        <div style={{ ...styles.panel, gridColumn: "1 / -1" }}>
          <h3 style={styles.panelTitle}>各縣市投票率排名 (2022 地方選舉)</h3>
          <ResponsiveContainer width="100%" height={Math.max(300, region_turnout.length * 26)}>
            <BarChart data={region_turnout} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" domain={[40, 75]} />
              <YAxis type="category" dataKey="name" width={65} fontSize={12} />
              <Tooltip formatter={(v) => `${v?.toFixed(1)}%`} />
              <Bar dataKey="turnout_rate" name="投票率">
                {region_turnout.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      (entry.turnout_rate || 0) >= 65 ? "#27ae60" :
                      (entry.turnout_rate || 0) >= 55 ? "#f39c12" : "#e74c3c"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: "4px" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "16px", flexWrap: "wrap", gap: "12px",
  },
  title: { margin: 0, fontSize: "1.3rem" },
  exportBtns: { display: "flex", gap: "8px" },
  exportBtn: {
    padding: "6px 14px", borderRadius: "6px", border: "1px solid #ddd",
    backgroundColor: "#fff", fontSize: "0.8rem", textDecoration: "none",
    color: "#333", cursor: "pointer",
  },

  statsRow: { display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" },
  statCard: {
    flex: "1 1 120px", padding: "16px", borderRadius: "10px",
    backgroundColor: "#fff", textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  statValue: { fontSize: "1.8rem", fontWeight: "bold", color: "#1a1a2e" },
  statLabel: { fontSize: "0.8rem", color: "#888" },

  grid: {
    display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },
  panel: {
    backgroundColor: "#fff", borderRadius: "12px", padding: "18px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  panelTitle: { margin: "0 0 14px", fontSize: "0.95rem" },

  // Battleground
  battleRow: {
    display: "flex", alignItems: "center", gap: "8px",
    marginBottom: "8px",
  },
  battleName: { width: "60px", fontSize: "0.85rem", fontWeight: "bold" },
  miniBar: {
    flex: 1, height: "8px", backgroundColor: "#eee",
    borderRadius: "4px", overflow: "hidden",
  },

  // Poll feed
  pollFeedItem: {
    padding: "10px 0", borderBottom: "1px solid #f0f0f0",
  },
  feedHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" },
  feedSource: { fontSize: "0.75rem", color: "#aaa", marginBottom: "4px" },
  feedParties: { display: "flex", flexWrap: "wrap" },
  simBadge: {
    fontSize: "0.6rem", padding: "1px 6px", borderRadius: "10px",
    backgroundColor: "#fff3cd", color: "#856404",
  },
  realBadge: {
    fontSize: "0.6rem", padding: "1px 6px", borderRadius: "10px",
    backgroundColor: "#d4edda", color: "#155724",
  },
  qualityRow: { display: "flex", gap: "6px", justifyContent: "center", marginTop: "8px" },
  qualityBadge: {
    fontSize: "0.7rem", padding: "3px 8px", borderRadius: "10px",
    backgroundColor: "#d4edda", color: "#155724",
  },
};
