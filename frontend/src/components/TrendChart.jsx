import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { getPartyTrend, getRegionHistory } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  親民黨: "#FF6310",
  新黨: "#FEDE00",
  中華新黨: "#FEDE00",
  無黨籍: "#999999",
};

export default function TrendChart({ elections, selectedRegion, regions }) {
  const [trendData, setTrendData] = useState([]);
  const [chartType, setChartType] = useState("line");

  useEffect(() => {
    if (selectedRegion) {
      getRegionHistory(selectedRegion, "presidential").then((history) => {
        const data = history.map((h) => {
          const row = { year: h.year };
          for (const r of h.results) {
            row[r.candidate_party || "其他"] = r.vote_rate;
          }
          return row;
        });
        setTrendData(data);
      });
    } else {
      getPartyTrend("presidential").then((data) => {
        const grouped = {};
        for (const item of data) {
          if (!grouped[item.year]) grouped[item.year] = { year: item.year };
          grouped[item.year][item.party] = item.vote_rate;
        }
        setTrendData(Object.values(grouped));
      });
    }
  }, [selectedRegion]);

  const allParties = [
    ...new Set(trendData.flatMap((d) => Object.keys(d).filter((k) => k !== "year"))),
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          {selectedRegion
            ? `${regions?.find((r) => r.code === selectedRegion)?.name || selectedRegion} 區域趨勢`
            : "全國政黨得票率趨勢"}
        </h2>
        <div style={styles.toggleGroup}>
          <button
            onClick={() => setChartType("line")}
            style={{
              ...styles.toggleBtn,
              ...(chartType === "line" ? styles.toggleActive : {}),
            }}
          >
            折線圖
          </button>
          <button
            onClick={() => setChartType("bar")}
            style={{
              ...styles.toggleBtn,
              ...(chartType === "bar" ? styles.toggleActive : {}),
            }}
          >
            長條圖
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={450}>
        {chartType === "line" ? (
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis unit="%" domain={[0, "auto"]} />
            <Tooltip formatter={(v) => `${v?.toFixed(2)}%`} />
            <Legend />
            {allParties.map((party) => (
              <Line
                key={party}
                type="monotone"
                dataKey={party}
                stroke={PARTY_COLORS[party] || "#999"}
                strokeWidth={2}
                dot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis unit="%" domain={[0, "auto"]} />
            <Tooltip formatter={(v) => `${v?.toFixed(2)}%`} />
            <Legend />
            {allParties.map((party) => (
              <Bar
                key={party}
                dataKey={party}
                fill={PARTY_COLORS[party] || "#999"}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  title: { margin: 0, fontSize: "1.1rem" },
  toggleGroup: { display: "flex", gap: "4px" },
  toggleBtn: {
    padding: "6px 14px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  toggleActive: {
    backgroundColor: "#1a1a2e",
    color: "#fff",
    borderColor: "#1a1a2e",
  },
};
