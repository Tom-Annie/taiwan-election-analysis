import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from "recharts";
import { getLegislativeSeats } from "../api/client";

const PARTY_COLORS = {
  中國國民黨: "#000095",
  民主進步黨: "#1B9431",
  台灣民眾黨: "#28C8C8",
  時代力量: "#FBBE01",
  親民黨: "#FF6310",
  台灣團結聯盟: "#C69E6A",
  台灣基進: "#A73F24",
  無黨聯盟: "#999",
  無黨籍: "#666",
};

const PARTY_SHORT = {
  中國國民黨: "國民黨",
  民主進步黨: "民進黨",
  台灣民眾黨: "民眾黨",
  時代力量: "時力",
  親民黨: "親民黨",
  台灣團結聯盟: "台聯",
  台灣基進: "基進",
  無黨聯盟: "無盟",
  無黨籍: "無黨籍",
};

const MAJOR = ["中國國民黨", "民主進步黨", "台灣民眾黨"];

export default function LegislativePanel() {
  const [seatData, setSeatData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    getLegislativeSeats().then((data) => {
      setSeatData(data);
      if (data.length > 0) setSelectedYear(data[data.length - 1].year);
    }).catch(console.error);
  }, []);

  const selectedElection = seatData.find((e) => e.year === selectedYear);

  // Stacked bar data for trend
  const trendData = seatData.map((e) => {
    const row = { year: e.year };
    for (const p of e.parties) {
      row[PARTY_SHORT[p.party] || p.party] = p.seats;
    }
    return row;
  });

  const allParties = [
    ...new Set(trendData.flatMap((d) => Object.keys(d).filter((k) => k !== "year"))),
  ];

  // Pie data for selected year
  const pieData = selectedElection
    ? selectedElection.parties
        .filter((p) => p.seats > 0)
        .map((p) => ({
          name: PARTY_SHORT[p.party] || p.party,
          value: p.seats,
          fill: PARTY_COLORS[p.party] || "#999",
          rate: p.vote_rate,
        }))
    : [];

  // Majority line = 57 (113/2 + 1)
  const majorityLine = 57;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>立法院國會版圖</h2>
      <p style={styles.subtitle}>2008-2024 歷屆立委選舉席次分析</p>

      {/* Year selector */}
      <div style={styles.yearRow}>
        {seatData.map((e) => (
          <button
            key={e.year}
            onClick={() => setSelectedYear(e.year)}
            style={{
              ...styles.yearBtn,
              ...(selectedYear === e.year ? styles.yearBtnActive : {}),
            }}
          >
            {e.year}
          </button>
        ))}
      </div>

      <div style={styles.grid}>
        {/* Seat pie chart */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>
            {selectedYear} 國會席次 ({selectedElection?.total_seats || 0} 席)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name} ${value}`}
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name, props) => {
                const rate = props.payload.rate;
                return [`${v} 席${rate ? ` (政黨票 ${rate}%)` : ""}`, name];
              }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Party detail cards */}
          <div style={styles.partyCards}>
            {pieData.map((p) => (
              <div key={p.name} style={{
                ...styles.partyCard,
                borderLeft: `4px solid ${p.fill}`,
              }}>
                <div style={styles.partyCardName}>{p.name}</div>
                <div style={styles.partyCardSeats}>{p.value} 席</div>
                {p.rate && <div style={styles.partyCardRate}>政黨票 {p.rate}%</div>}
                {p.value >= majorityLine && (
                  <div style={styles.majorityTag}>過半</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Seat trend stacked bar */}
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>歷屆席次變遷</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              {allParties.map((party) => {
                const fullName = Object.entries(PARTY_SHORT).find(([, v]) => v === party);
                const color = fullName ? PARTY_COLORS[fullName[0]] : "#999";
                return (
                  <Bar key={party} dataKey={party} stackId="a" fill={color} />
                );
              })}
            </BarChart>
          </ResponsiveContainer>

          {/* Majority indicator */}
          <div style={styles.majorityInfo}>
            <span style={styles.majorityDot} />
            過半門檻: {majorityLine} 席 (113 席總數)
          </div>

          {/* Area chart for major parties */}
          <h3 style={{ ...styles.panelTitle, marginTop: "20px" }}>三大黨席次趨勢</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              {MAJOR.map((full) => {
                const short = PARTY_SHORT[full];
                return (
                  <Area
                    key={short}
                    type="monotone"
                    dataKey={short}
                    stroke={PARTY_COLORS[full]}
                    fill={PARTY_COLORS[full]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    connectNulls
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#fff", borderRadius: "12px", padding: "20px" },
  title: { margin: 0, fontSize: "1.2rem" },
  subtitle: { margin: "4px 0 16px", fontSize: "0.8rem", color: "#888" },

  yearRow: { display: "flex", gap: "6px", marginBottom: "16px" },
  yearBtn: {
    padding: "8px 18px", borderRadius: "8px", border: "1px solid #ddd",
    backgroundColor: "#fff", cursor: "pointer", fontSize: "0.9rem",
    fontWeight: "bold",
  },
  yearBtnActive: {
    backgroundColor: "#1a1a2e", color: "#fff", borderColor: "#1a1a2e",
  },

  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  panel: {
    padding: "16px", borderRadius: "10px", backgroundColor: "#f8f9fa",
  },
  panelTitle: { margin: "0 0 12px", fontSize: "0.95rem" },

  partyCards: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" },
  partyCard: {
    padding: "8px 12px", borderRadius: "8px", backgroundColor: "#fff",
    minWidth: "80px",
  },
  partyCardName: { fontSize: "0.8rem", fontWeight: "bold" },
  partyCardSeats: { fontSize: "1.1rem", fontWeight: "bold" },
  partyCardRate: { fontSize: "0.7rem", color: "#888" },
  majorityTag: {
    fontSize: "0.6rem", backgroundColor: "#e74c3c", color: "#fff",
    padding: "1px 6px", borderRadius: "4px", display: "inline-block", marginTop: "2px",
  },

  majorityInfo: {
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "0.8rem", color: "#888", marginTop: "8px",
  },
  majorityDot: {
    width: "12px", height: "2px", backgroundColor: "#e74c3c",
    display: "inline-block",
  },
};
