import React from "react";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  親民黨: "#FF6310",
  新黨: "#FEDE00",
  中華新黨: "#FEDE00",
  無黨籍: "#999999",
};

export default function Sidebar({
  elections,
  selectedElection,
  onSelectElection,
  selectedRegion,
  onSelectRegion,
  regions,
}) {
  return (
    <aside style={styles.sidebar}>
      {/* Election selector */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>選舉屆次</h3>
        <select
          style={styles.select}
          value={selectedElection?.id || ""}
          onChange={(e) => onSelectElection(Number(e.target.value))}
        >
          {elections.map((el) => (
            <option key={el.id} value={el.id}>
              {el.year} {el.name}
            </option>
          ))}
        </select>
      </div>

      {/* Region selector */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>縣市</h3>
        <select
          style={styles.select}
          value={selectedRegion || ""}
          onChange={(e) => onSelectRegion(e.target.value || null)}
        >
          <option value="">全國</option>
          {regions.map((r) => (
            <option key={r.code} value={r.code}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Candidate results */}
      {selectedElection && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            {selectedElection.year} 候選人得票
          </h3>
          <div style={styles.turnout}>
            投票率: {selectedElection.turnout_rate?.toFixed(2)}%
          </div>
          {selectedElection.candidates
            ?.sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
            .map((c) => (
              <div key={c.id} style={styles.candidateCard}>
                <div style={styles.candidateHeader}>
                  <span
                    style={{
                      ...styles.partyDot,
                      backgroundColor:
                        PARTY_COLORS[c.party] || "#999",
                    }}
                  />
                  <strong>
                    {c.number}號 {c.name}
                  </strong>
                  {c.elected === 1 && (
                    <span style={styles.elected}>當選</span>
                  )}
                </div>
                <div style={styles.candidateParty}>{c.party}</div>
                <div style={styles.candidateVotes}>
                  {(c.total_votes || 0).toLocaleString()} 票 (
                  {c.vote_rate?.toFixed(2)}%)
                </div>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${c.vote_rate || 0}%`,
                      backgroundColor:
                        PARTY_COLORS[c.party] || "#999",
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: "300px",
    backgroundColor: "#fff",
    borderRight: "1px solid #e0e0e0",
    padding: "16px",
    overflowY: "auto",
    flexShrink: 0,
  },
  section: { marginBottom: "20px" },
  sectionTitle: {
    fontSize: "0.85rem",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: "8px",
  },
  select: {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "0.9rem",
  },
  turnout: {
    fontSize: "0.85rem",
    color: "#888",
    marginBottom: "12px",
  },
  candidateCard: {
    padding: "10px",
    marginBottom: "8px",
    borderRadius: "8px",
    backgroundColor: "#f9f9f9",
  },
  candidateHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "2px",
  },
  partyDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
  },
  elected: {
    fontSize: "0.7rem",
    color: "#fff",
    backgroundColor: "#e74c3c",
    padding: "1px 6px",
    borderRadius: "4px",
    marginLeft: "auto",
  },
  candidateParty: { fontSize: "0.8rem", color: "#888", marginBottom: "4px" },
  candidateVotes: { fontSize: "0.85rem", marginBottom: "6px" },
  barContainer: {
    height: "6px",
    backgroundColor: "#eee",
    borderRadius: "3px",
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.5s ease",
  },
};
