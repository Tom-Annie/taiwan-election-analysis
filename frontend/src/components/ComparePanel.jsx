import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { compareElections } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  親民黨: "#FF6310",
  無黨籍: "#999999",
};

export default function ComparePanel({ elections, regions }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [compareData, setCompareData] = useState([]);

  const toggleElection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleRegion = (code) => {
    setSelectedRegions((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 1) return;
    const data = await compareElections(
      selectedIds,
      selectedRegions.length > 0 ? selectedRegions : null
    );

    // Transform for chart: group by region, show party vote rates per election
    const grouped = {};
    for (const item of data) {
      const key = item.region_name;
      if (!grouped[key]) grouped[key] = { region: key };
      for (const r of item.results) {
        const label = `${item.election.year} ${r.candidate_party || "其他"}`;
        grouped[key][label] = r.vote_rate;
      }
    }
    setCompareData(Object.values(grouped));
  };

  const allKeys = [
    ...new Set(
      compareData.flatMap((d) =>
        Object.keys(d).filter((k) => k !== "region")
      )
    ),
  ];

  const getBarColor = (key) => {
    for (const [party, color] of Object.entries(PARTY_COLORS)) {
      if (key.includes(party)) return color;
    }
    return "#999";
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>跨屆比較</h2>

      <div style={styles.selectors}>
        <div style={styles.selectorGroup}>
          <h4 style={styles.selectorTitle}>選擇屆次（可多選）</h4>
          <div style={styles.chips}>
            {elections.map((el) => (
              <button
                key={el.id}
                onClick={() => toggleElection(el.id)}
                style={{
                  ...styles.chip,
                  ...(selectedIds.includes(el.id) ? styles.chipActive : {}),
                }}
              >
                {el.year}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.selectorGroup}>
          <h4 style={styles.selectorTitle}>選擇縣市（可多選，空白=全部）</h4>
          <div style={styles.chips}>
            {regions.map((r) => (
              <button
                key={r.code}
                onClick={() => toggleRegion(r.code)}
                style={{
                  ...styles.chip,
                  ...(selectedRegions.includes(r.code)
                    ? styles.chipActive
                    : {}),
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleCompare} style={styles.compareBtn}>
          開始比較
        </button>
      </div>

      {compareData.length > 0 && (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={compareData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" unit="%" domain={[0, 70]} />
            <YAxis type="category" dataKey="region" width={80} />
            <Tooltip formatter={(v) => `${v?.toFixed(2)}%`} />
            <Legend />
            {allKeys.map((key) => (
              <Bar key={key} dataKey={key} fill={getBarColor(key)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "20px",
  },
  title: { margin: "0 0 16px", fontSize: "1.1rem" },
  selectors: { marginBottom: "20px" },
  selectorGroup: { marginBottom: "12px" },
  selectorTitle: { margin: "0 0 8px", fontSize: "0.85rem", color: "#666" },
  chips: { display: "flex", flexWrap: "wrap", gap: "6px" },
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
  compareBtn: {
    marginTop: "12px",
    padding: "10px 24px",
    backgroundColor: "#1a1a2e",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
};
