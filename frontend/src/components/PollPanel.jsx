import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getPollSummary, getPollTrend } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  無黨籍: "#999999",
};

const PARTY_SHORT = {
  民主進步黨: "民進黨",
  中國國民黨: "國民黨",
  台灣民眾黨: "民眾黨",
  無黨籍: "無黨籍",
};

export default function PollPanel({ regions }) {
  const [summary, setSummary] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [trend, setTrend] = useState([]);

  useEffect(() => {
    getPollSummary().then(setSummary).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      getPollTrend(selectedRegion).then(setTrend).catch(console.error);
    }
  }, [selectedRegion]);

  const selectedData = summary.find((s) => s.region_code === selectedRegion);

  // Overview bar chart data
  const overviewData = summary
    .filter((s) => s.latest_poll)
    .map((s) => {
      const row = { name: s.region_name, code: s.region_code };
      if (s.latest_poll?.items) {
        for (const item of s.latest_poll.items) {
          row[PARTY_SHORT[item.party] || item.party] = item.support_rate;
        }
      }
      return row;
    });

  const allParties = [
    ...new Set(
      overviewData.flatMap((d) =>
        Object.keys(d).filter((k) => !["name", "code"].includes(k))
      )
    ),
  ];

  // Trend chart data
  const trendData = trend.map((t) => {
    const row = { date: t.date.slice(5), source: t.source };
    for (const [party, rate] of Object.entries(t.parties)) {
      row[PARTY_SHORT[party] || party] = rate;
    }
    return row;
  });

  const trendParties = [
    ...new Set(
      trendData.flatMap((d) =>
        Object.keys(d).filter((k) => !["date", "source"].includes(k))
      )
    ),
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>2026 九合一選舉民調</h2>
          <p style={styles.subtitle}>各縣市最新民調支持度（模擬資料）</p>
        </div>
      </div>

      {/* Region chips */}
      <div style={styles.chips}>
        <button
          onClick={() => setSelectedRegion(null)}
          style={{
            ...styles.chip,
            ...(!selectedRegion ? styles.chipActive : {}),
          }}
        >
          全部總覽
        </button>
        {summary
          .filter((s) => s.latest_poll)
          .map((s) => (
            <button
              key={s.region_code}
              onClick={() => setSelectedRegion(s.region_code)}
              style={{
                ...styles.chip,
                ...(selectedRegion === s.region_code
                  ? {
                      backgroundColor: PARTY_COLORS[s.leading_party] || "#999",
                      color: "#fff",
                      borderColor: PARTY_COLORS[s.leading_party] || "#999",
                    }
                  : {}),
              }}
            >
              {s.region_name}
            </button>
          ))}
      </div>

      {/* Overview mode */}
      {!selectedRegion && (
        <>
          {/* Summary cards */}
          <div style={styles.cardGrid}>
            {summary
              .filter((s) => s.latest_poll)
              .map((s) => (
                <div
                  key={s.region_code}
                  style={{
                    ...styles.summaryCard,
                    borderTop: `3px solid ${PARTY_COLORS[s.leading_party] || "#ccc"}`,
                  }}
                  onClick={() => setSelectedRegion(s.region_code)}
                >
                  <div style={styles.cardName}>{s.region_name}</div>
                  <div style={styles.cardLeader}>
                    <span
                      style={{
                        color: PARTY_COLORS[s.leading_party] || "#999",
                        fontWeight: "bold",
                      }}
                    >
                      {PARTY_SHORT[s.leading_party] || s.leading_party}
                    </span>
                    <span style={styles.cardRate}>{s.leading_rate}%</span>
                  </div>
                  {/* Mini bar for each party */}
                  {s.latest_poll?.items
                    ?.sort((a, b) => b.support_rate - a.support_rate)
                    .map((item, i) => (
                      <div key={i} style={styles.miniBarRow}>
                        <span style={styles.miniLabel}>
                          {PARTY_SHORT[item.party] || item.party}
                        </span>
                        <div style={styles.miniBarBg}>
                          <div
                            style={{
                              ...styles.miniBarFill,
                              width: `${item.support_rate}%`,
                              backgroundColor:
                                PARTY_COLORS[item.party] || "#ccc",
                            }}
                          />
                        </div>
                        <span style={styles.miniRate}>
                          {item.support_rate}%
                        </span>
                      </div>
                    ))}
                  <div style={styles.cardMeta}>
                    {s.latest_poll.source} · {s.latest_poll.date}
                  </div>
                </div>
              ))}
          </div>

          {/* Full bar chart */}
          <div style={{ marginTop: "24px" }}>
            <h3 style={styles.sectionTitle}>各縣市民調支持度一覽</h3>
            <ResponsiveContainer
              width="100%"
              height={Math.max(400, overviewData.length * 36)}
            >
              <BarChart
                data={overviewData}
                layout="vertical"
                margin={{ left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" unit="%" domain={[0, 60]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  fontSize={12}
                />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                {allParties.map((party) => {
                  const fullName = Object.entries(PARTY_SHORT).find(
                    ([, v]) => v === party
                  );
                  const color = fullName
                    ? PARTY_COLORS[fullName[0]]
                    : "#999";
                  return (
                    <Bar key={party} dataKey={party} fill={color} />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Detail mode */}
      {selectedRegion && selectedData && (
        <div style={styles.detailSection}>
          <h3 style={{ margin: "0 0 16px" }}>{selectedData.region_name} 民調詳情</h3>

          {/* Latest poll results */}
          {selectedData.latest_poll && (
            <div style={styles.pollCard}>
              <div style={styles.pollHeader}>
                <span style={styles.pollSource}>
                  {selectedData.latest_poll.source}
                </span>
                <span style={styles.pollDate}>
                  {selectedData.latest_poll.date}
                </span>
                <span style={styles.pollMeta}>
                  n={selectedData.latest_poll.sample_size} ±
                  {selectedData.latest_poll.margin_of_error}%
                </span>
              </div>
              {selectedData.latest_poll.items
                ?.sort((a, b) => b.support_rate - a.support_rate)
                .map((item, i) => (
                  <div key={i} style={styles.resultRow}>
                    <div style={styles.resultLeft}>
                      <span
                        style={{
                          ...styles.dot,
                          backgroundColor:
                            PARTY_COLORS[item.party] || "#999",
                        }}
                      />
                      <span>
                        {item.candidate_name
                          ? `${item.candidate_name} `
                          : ""}
                        ({PARTY_SHORT[item.party] || item.party})
                      </span>
                    </div>
                    <div style={styles.resultBarBg}>
                      <div
                        style={{
                          ...styles.resultBarFill,
                          width: `${item.support_rate * 1.8}%`,
                          backgroundColor:
                            PARTY_COLORS[item.party] || "#999",
                        }}
                      />
                    </div>
                    <strong>{item.support_rate}%</strong>
                  </div>
                ))}
            </div>
          )}

          {/* Trend chart */}
          {trendData.length > 1 && (
            <div style={{ marginTop: "20px" }}>
              <h4 style={styles.sectionTitle}>民調趨勢</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis unit="%" domain={[0, "auto"]} />
                  <Tooltip
                    formatter={(v) => `${v}%`}
                    labelFormatter={(l) => trendData.find((t) => t.date === l)?.source || l}
                  />
                  <Legend />
                  {trendParties.map((party) => {
                    const fullName = Object.entries(PARTY_SHORT).find(
                      ([, v]) => v === party
                    );
                    const color = fullName
                      ? PARTY_COLORS[fullName[0]]
                      : "#999";
                    return (
                      <Line
                        key={party}
                        type="monotone"
                        dataKey={party}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 5 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All polls list */}
          <div style={{ marginTop: "16px" }}>
            <h4 style={styles.sectionTitle}>
              共 {selectedData.poll_count} 筆民調
            </h4>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#fff", borderRadius: "12px", padding: "20px" },
  header: { marginBottom: "16px" },
  title: { margin: 0, fontSize: "1.2rem" },
  subtitle: { margin: "4px 0 0", fontSize: "0.8rem", color: "#888" },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginBottom: "20px",
  },
  chip: {
    padding: "6px 12px",
    border: "1px solid #ddd",
    borderRadius: "20px",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "0.8rem",
    transition: "all 0.2s",
  },
  chipActive: {
    backgroundColor: "#1a1a2e",
    color: "#fff",
    borderColor: "#1a1a2e",
  },

  // Card grid
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "12px",
  },
  summaryCard: {
    padding: "14px",
    borderRadius: "10px",
    backgroundColor: "#f8f9fa",
    cursor: "pointer",
    transition: "transform 0.2s",
  },
  cardName: { fontWeight: "bold", marginBottom: "4px" },
  cardLeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    fontSize: "0.9rem",
  },
  cardRate: { fontWeight: "bold" },
  miniBarRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "3px",
  },
  miniLabel: { width: "45px", fontSize: "0.7rem", color: "#888" },
  miniBarBg: {
    flex: 1,
    height: "6px",
    backgroundColor: "#e9ecef",
    borderRadius: "3px",
    overflow: "hidden",
  },
  miniBarFill: { height: "100%", borderRadius: "3px" },
  miniRate: { width: "35px", fontSize: "0.7rem", textAlign: "right" },
  cardMeta: { fontSize: "0.7rem", color: "#aaa", marginTop: "8px" },

  sectionTitle: { fontSize: "0.9rem", color: "#555", marginBottom: "12px" },

  // Detail
  detailSection: { marginTop: "8px" },
  pollCard: {
    padding: "16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "10px",
  },
  pollHeader: {
    display: "flex",
    gap: "12px",
    marginBottom: "14px",
    fontSize: "0.85rem",
  },
  pollSource: { fontWeight: "bold" },
  pollDate: { color: "#888" },
  pollMeta: { color: "#aaa", marginLeft: "auto" },
  resultRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },
  resultLeft: {
    width: "160px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.9rem",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  resultBarBg: {
    flex: 1,
    height: "18px",
    backgroundColor: "#e9ecef",
    borderRadius: "4px",
    overflow: "hidden",
  },
  resultBarFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.5s",
  },
};
