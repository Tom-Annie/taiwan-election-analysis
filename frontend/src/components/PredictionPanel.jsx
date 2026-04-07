import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { getPredictions, getPredictionSummary } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  "其他/無黨籍": "#999999",
};

const PARTY_SHORT = {
  民主進步黨: "民進黨",
  中國國民黨: "國民黨",
  台灣民眾黨: "民眾黨",
  "其他/無黨籍": "其他",
};

export default function PredictionPanel() {
  const [predictions, setPredictions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [view, setView] = useState("overview"); // overview | detail

  useEffect(() => {
    getPredictions().then(setPredictions).catch(console.error);
    getPredictionSummary().then(setSummary).catch(console.error);
  }, []);

  const selected = selectedRegion
    ? predictions.find((p) => p.region_code === selectedRegion)
    : null;

  const seatData = summary
    ? Object.entries(summary.party_seats).map(([party, seats]) => ({
        party: PARTY_SHORT[party] || party,
        seats,
        fill: PARTY_COLORS[party] || "#999",
      }))
    : [];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>2026 九合一選舉預測</h2>
          <p style={styles.subtitle}>
            基於歷屆地方選舉趨勢 + 2024 總統選舉基本盤 + 鐘擺效應模型
          </p>
        </div>
        <div style={styles.toggleGroup}>
          <button
            onClick={() => { setView("overview"); setSelectedRegion(null); }}
            style={{ ...styles.toggleBtn, ...(view === "overview" ? styles.toggleActive : {}) }}
          >
            總覽
          </button>
          <button
            onClick={() => setView("detail")}
            style={{ ...styles.toggleBtn, ...(view === "detail" ? styles.toggleActive : {}) }}
          >
            各縣市詳情
          </button>
        </div>
      </div>

      {view === "overview" && summary && (
        <>
          {/* Summary cards */}
          <div style={styles.cardRow}>
            <div style={styles.card}>
              <div style={styles.cardLabel}>預測總席次</div>
              <div style={styles.cardValue}>{summary.total_seats}</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardLabel}>平均信心度</div>
              <div style={styles.cardValue}>{summary.avg_confidence}%</div>
            </div>
            {Object.entries(summary.party_seats).map(([party, seats]) => (
              <div key={party} style={{ ...styles.card, borderLeft: `4px solid ${PARTY_COLORS[party] || "#999"}` }}>
                <div style={styles.cardLabel}>{PARTY_SHORT[party] || party}</div>
                <div style={styles.cardValue}>{seats} 席</div>
              </div>
            ))}
          </div>

          {/* Seat pie chart */}
          <div style={styles.chartSection}>
            <h3 style={styles.sectionTitle}>預估席次分布</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={seatData}
                  dataKey="seats"
                  nameKey="party"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ party, seats }) => `${party} ${seats}席`}
                >
                  {seatData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Battleground */}
          {summary.battlegrounds?.length > 0 && (
            <div style={styles.chartSection}>
              <h3 style={styles.sectionTitle}>關鍵搖擺選區</h3>
              <div style={styles.battleList}>
                {summary.battlegrounds.map((b) => (
                  <div
                    key={b.region_code}
                    style={styles.battleCard}
                    onClick={() => { setSelectedRegion(b.region_code); setView("detail"); }}
                  >
                    <div style={styles.battleName}>{b.region_name}</div>
                    <div style={styles.battleInfo}>
                      <span style={{
                        color: PARTY_COLORS[b.predicted_winner] || "#999",
                        fontWeight: "bold",
                      }}>
                        {PARTY_SHORT[b.predicted_winner] || b.predicted_winner}
                      </span>
                      <span style={styles.battleProb}>
                        勝率 {b.win_probability}%
                      </span>
                    </div>
                    <div style={styles.probBar}>
                      <div style={{
                        ...styles.probFill,
                        width: `${b.win_probability}%`,
                        backgroundColor: PARTY_COLORS[b.predicted_winner] || "#999",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All regions bar chart */}
          <div style={styles.chartSection}>
            <h3 style={styles.sectionTitle}>全縣市預測得票率</h3>
            <ResponsiveContainer width="100%" height={Math.max(400, predictions.length * 32)}>
              <BarChart
                data={predictions.map((p) => ({
                  name: p.region_name,
                  ...Object.fromEntries(
                    Object.entries(p.predicted_rates).map(([k, v]) => [PARTY_SHORT[k] || k, v])
                  ),
                  code: p.region_code,
                }))}
                layout="vertical"
                margin={{ left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={70} fontSize={12} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                {Object.entries(PARTY_SHORT).map(([full, short]) => (
                  <Bar
                    key={short}
                    dataKey={short}
                    fill={PARTY_COLORS[full]}
                    stackId="a"
                    onClick={(data) => {
                      const pred = predictions.find((p) => p.region_name === data.name);
                      if (pred) { setSelectedRegion(pred.region_code); setView("detail"); }
                    }}
                    cursor="pointer"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {view === "detail" && (
        <div>
          {/* Region selector */}
          <div style={styles.regionSelector}>
            {predictions.map((p) => (
              <button
                key={p.region_code}
                onClick={() => setSelectedRegion(p.region_code)}
                style={{
                  ...styles.regionChip,
                  ...(selectedRegion === p.region_code ? {
                    backgroundColor: PARTY_COLORS[p.predicted_winner] || "#999",
                    color: "#fff",
                    borderColor: PARTY_COLORS[p.predicted_winner] || "#999",
                  } : {}),
                }}
              >
                {p.region_name}
              </button>
            ))}
          </div>

          {selected && <RegionDetail pred={selected} />}
          {!selected && (
            <p style={{ color: "#888", textAlign: "center", marginTop: "40px" }}>
              請選擇一個縣市查看詳細預測
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RegionDetail({ pred }) {
  const rateData = Object.entries(pred.predicted_rates)
    .map(([party, rate]) => ({
      party: PARTY_SHORT[party] || party,
      rate,
      fill: PARTY_COLORS[party] || "#999",
    }))
    .sort((a, b) => b.rate - a.rate);

  return (
    <div style={styles.detailContainer}>
      {/* Region header */}
      <div style={styles.detailHeader}>
        <h3 style={styles.detailTitle}>{pred.region_name}</h3>
        <div style={styles.badges}>
          <span style={{
            ...styles.badge,
            backgroundColor: PARTY_COLORS[pred.predicted_winner] || "#999",
          }}>
            預測: {PARTY_SHORT[pred.predicted_winner] || pred.predicted_winner} 勝
          </span>
          <span style={styles.badgeOutline}>
            勝率 {pred.win_probability}%
          </span>
          <span style={styles.badgeOutline}>
            信心度 {pred.confidence}%
          </span>
          <span style={{
            ...styles.badgeOutline,
            backgroundColor: pred.data_quality === "real_polls" ? "#d4edda" : pred.data_quality === "simulated_polls" ? "#fff3cd" : "#f8d7da",
            borderColor: "transparent",
            color: pred.data_quality === "real_polls" ? "#155724" : pred.data_quality === "simulated_polls" ? "#856404" : "#721c24",
          }}>
            {pred.data_quality === "real_polls" ? `真實民調 ×${pred.poll_count}` : pred.data_quality === "simulated_polls" ? "模擬民調" : "純歷史模型"}
          </span>
        </div>
      </div>

      {/* Incumbent info */}
      {pred.incumbent?.name && (
        <div style={styles.incumbentBox}>
          現任: <strong>{pred.incumbent.name}</strong>
          <span style={{
            ...styles.partyTag,
            backgroundColor: PARTY_COLORS[pred.incumbent.party] || "#999",
          }}>
            {PARTY_SHORT[pred.incumbent.party] || pred.incumbent.party}
          </span>
        </div>
      )}

      {/* Predicted rates */}
      <div style={styles.rateSection}>
        <h4 style={styles.sectionTitle}>預測得票率</h4>
        {rateData.map((d) => (
          <div key={d.party} style={styles.rateRow}>
            <div style={styles.rateLabel}>
              <span style={{ ...styles.dot, backgroundColor: d.fill }} />
              {d.party}
            </div>
            <div style={styles.rateBarContainer}>
              <div style={{ ...styles.rateFill, width: `${d.rate}%`, backgroundColor: d.fill }} />
            </div>
            <div style={styles.rateValue}>{d.rate}%</div>
          </div>
        ))}
      </div>

      {/* History trend */}
      {pred.history?.length > 0 && (
        <div style={styles.rateSection}>
          <h4 style={styles.sectionTitle}>歷屆地方選舉趨勢</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={pred.history.map((h) => ({
                year: h.year,
                ...Object.fromEntries(
                  Object.entries(h.parties).map(([k, v]) => [PARTY_SHORT[k] || k, v])
                ),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis unit="%" domain={[0, "auto"]} />
              <Tooltip formatter={(v) => `${v?.toFixed(1)}%`} />
              <Legend />
              {Object.entries(PARTY_SHORT).map(([full, short]) => (
                <Bar key={short} dataKey={short} fill={PARTY_COLORS[full]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Poll vs Model comparison */}
      {pred.poll_vs_model && Object.keys(pred.poll_vs_model).length > 0 && (
        <div style={styles.rateSection}>
          <h4 style={styles.sectionTitle}>民調 vs 模型預測差距</h4>
          {Object.entries(pred.poll_vs_model).map(([party, data]) => {
            const short = PARTY_SHORT[party] || party;
            const color = PARTY_COLORS[party] || "#999";
            const diffColor = data.diff > 0 ? "#1B9431" : data.diff < 0 ? "#e74c3c" : "#888";
            return (
              <div key={party} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", fontSize: "0.85rem" }}>
                <span style={{ ...styles.dot, backgroundColor: color }} />
                <span style={{ width: "55px" }}>{short}</span>
                <span style={{ width: "80px" }}>民調 {data.poll}%</span>
                <span style={{ width: "80px" }}>模型 {data.model}%</span>
                <span style={{ color: diffColor, fontWeight: "bold" }}>
                  {data.diff > 0 ? "+" : ""}{data.diff}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Model factors */}
      <div style={styles.factorBox}>
        <h4 style={styles.sectionTitle}>模型參數</h4>
        <div style={styles.factorGrid}>
          <div>民調權重: <strong>{(pred.factors.poll_weight * 100).toFixed(0)}%</strong></div>
          <div>歷史趨勢權重: <strong>{(pred.factors.history_weight * 100).toFixed(0)}%</strong></div>
          <div>總統基本盤權重: <strong>{(pred.factors.presidential_weight * 100).toFixed(0)}%</strong></div>
          <div>在任者優勢: <strong>+{pred.factors.incumbency_bonus}%</strong></div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#fff", borderRadius: "12px", padding: "20px" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: "20px", flexWrap: "wrap", gap: "12px",
  },
  title: { margin: 0, fontSize: "1.2rem" },
  subtitle: { margin: "4px 0 0", fontSize: "0.8rem", color: "#888" },
  toggleGroup: { display: "flex", gap: "4px" },
  toggleBtn: {
    padding: "6px 14px", border: "1px solid #ddd", borderRadius: "6px",
    backgroundColor: "#fff", cursor: "pointer", fontSize: "0.85rem",
  },
  toggleActive: { backgroundColor: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e" },

  // Summary cards
  cardRow: { display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" },
  card: {
    flex: "1 1 140px", padding: "16px", borderRadius: "10px",
    backgroundColor: "#f8f9fa", minWidth: "120px",
  },
  cardLabel: { fontSize: "0.75rem", color: "#888", marginBottom: "4px" },
  cardValue: { fontSize: "1.4rem", fontWeight: "bold" },

  // Charts
  chartSection: { marginBottom: "28px" },
  sectionTitle: { fontSize: "0.9rem", color: "#555", marginBottom: "12px" },

  // Battleground
  battleList: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" },
  battleCard: {
    padding: "14px", borderRadius: "10px", backgroundColor: "#f8f9fa",
    cursor: "pointer", transition: "transform 0.2s",
  },
  battleName: { fontWeight: "bold", marginBottom: "6px" },
  battleInfo: { display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.85rem" },
  battleProb: { color: "#888" },
  probBar: { height: "4px", backgroundColor: "#eee", borderRadius: "2px", overflow: "hidden" },
  probFill: { height: "100%", borderRadius: "2px", transition: "width 0.5s" },

  // Detail view
  regionSelector: { display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" },
  regionChip: {
    padding: "6px 12px", border: "1px solid #ddd", borderRadius: "20px",
    backgroundColor: "#fff", cursor: "pointer", fontSize: "0.8rem", transition: "all 0.2s",
  },
  detailContainer: { backgroundColor: "#f8f9fa", borderRadius: "12px", padding: "20px" },
  detailHeader: { marginBottom: "16px" },
  detailTitle: { margin: "0 0 8px", fontSize: "1.2rem" },
  badges: { display: "flex", gap: "8px", flexWrap: "wrap" },
  badge: {
    padding: "4px 12px", borderRadius: "20px", color: "#fff",
    fontSize: "0.8rem", fontWeight: "bold",
  },
  badgeOutline: {
    padding: "4px 12px", borderRadius: "20px", border: "1px solid #ccc",
    fontSize: "0.8rem", color: "#666",
  },
  incumbentBox: {
    padding: "10px 14px", backgroundColor: "#fff", borderRadius: "8px",
    marginBottom: "16px", fontSize: "0.9rem",
  },
  partyTag: {
    marginLeft: "8px", padding: "2px 8px", borderRadius: "4px",
    color: "#fff", fontSize: "0.75rem",
  },

  // Rate bars
  rateSection: { marginBottom: "20px" },
  rateRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  rateLabel: { width: "80px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  rateBarContainer: {
    flex: 1, height: "20px", backgroundColor: "#e9ecef",
    borderRadius: "4px", overflow: "hidden",
  },
  rateFill: { height: "100%", borderRadius: "4px", transition: "width 0.5s" },
  rateValue: { width: "50px", textAlign: "right", fontWeight: "bold", fontSize: "0.9rem" },

  // Factors
  factorBox: {
    padding: "14px", backgroundColor: "#fff", borderRadius: "8px",
    border: "1px dashed #ddd",
  },
  factorGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr",
    gap: "8px", fontSize: "0.8rem", color: "#666",
  },
};
