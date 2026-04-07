import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { getElectionResults, getPollSummary, getPredictions } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  親民黨: "#FF6310",
  無黨籍: "#999999",
  "其他/無黨籍": "#999999",
};

const PARTY_SHORT = {
  民主進步黨: "民進黨",
  中國國民黨: "國民黨",
  台灣民眾黨: "民眾黨",
  "其他/無黨籍": "其他",
};

const MODES = [
  { key: "election", label: "選舉結果" },
  { key: "poll", label: "最新民調" },
  { key: "prediction", label: "2026預測" },
];

export default function ElectionMap({
  election,
  regions,
  selectedRegion,
  onSelectRegion,
}) {
  const [geoData, setGeoData] = useState(null);
  const [resultsByRegion, setResultsByRegion] = useState({});
  const [pollSummary, setPollSummary] = useState({});
  const [predictions, setPredictions] = useState({});
  const [mapMode, setMapMode] = useState("election");
  const [flipRegions, setFlipRegions] = useState(new Set());
  const geoRef = useRef(null);

  useEffect(() => {
    fetch("/tw-counties.json")
      .then((r) => r.json())
      .then(setGeoData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!election) return;
    getElectionResults(election.id).then((data) => {
      const grouped = {};
      for (const r of data) {
        if (!grouped[r.region_code]) grouped[r.region_code] = [];
        grouped[r.region_code].push(r);
      }
      setResultsByRegion(grouped);
    });
  }, [election]);

  useEffect(() => {
    getPollSummary().then((data) => {
      const map = {};
      for (const item of data) map[item.region_code] = item;
      setPollSummary(map);
    }).catch(console.error);

    getPredictions().then((data) => {
      const map = {};
      for (const item of data) map[item.region_code] = item;
      setPredictions(map);

      // Detect flips: 2022 winner != predicted 2026 winner
      const flips = new Set();
      for (const pred of data) {
        const results = resultsByRegion[pred.region_code];
        if (results?.length > 0) {
          const lastWinner = results.reduce((a, b) => a.votes > b.votes ? a : b);
          if (lastWinner.candidate_party !== pred.predicted_winner) {
            flips.add(pred.region_code);
          }
        }
      }
      setFlipRegions(flips);
    }).catch(console.error);
  }, [resultsByRegion]);

  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.clearLayers();
      if (geoData) geoRef.current.addData(geoData);
    }
  }, [resultsByRegion, pollSummary, predictions, mapMode, selectedRegion, geoData]);

  const getRegionColor = (code) => {
    if (mapMode === "poll") {
      const poll = pollSummary[code];
      return poll?.leading_party ? PARTY_COLORS[poll.leading_party] || "#ccc" : "#ccc";
    }
    if (mapMode === "prediction") {
      const pred = predictions[code];
      return pred ? PARTY_COLORS[pred.predicted_winner] || "#ccc" : "#ccc";
    }
    const results = resultsByRegion[code];
    if (!results?.length) return "#ccc";
    const winner = results.reduce((a, b) => (a.votes > b.votes ? a : b));
    return PARTY_COLORS[winner.candidate_party] || "#ccc";
  };

  const isFlip = (code) => mapMode === "prediction" && flipRegions.has(code);

  const style = (feature) => {
    const code = feature.properties.code;
    const isSelected = selectedRegion === code;
    const flip = isFlip(code);
    return {
      fillColor: getRegionColor(code),
      fillOpacity: isSelected ? 0.85 : 0.6,
      color: flip ? "#ff4444" : isSelected ? "#fff" : "#333",
      weight: flip ? 3 : isSelected ? 3 : 1,
      opacity: 1,
      dashArray: flip ? "6 3" : null,
    };
  };

  const onEachFeature = (feature, layer) => {
    const code = feature.properties.code;
    const name = feature.properties.name;

    layer.on({
      click: () => onSelectRegion(code),
      mouseover: (e) => e.target.setStyle({ fillOpacity: 0.85, weight: 2 }),
      mouseout: (e) => {
        if (selectedRegion !== code) {
          const flip = isFlip(code);
          e.target.setStyle({
            fillOpacity: 0.6,
            weight: flip ? 3 : 1,
          });
        }
      },
    });

    let html = `<strong>${name}</strong>`;
    const dot = (color) =>
      `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px"></span>`;

    if (mapMode === "poll") {
      const poll = pollSummary[code];
      if (poll?.latest_poll) {
        html += `<div style="font-size:11px;color:#888;margin:2px 0">${poll.latest_poll.source} (${poll.latest_poll.date})${poll.latest_poll.is_simulated ? " [模擬]" : ""}</div>`;
        for (const item of [...poll.latest_poll.items].sort((a, b) => b.support_rate - a.support_rate)) {
          const c = PARTY_COLORS[item.party] || "#999";
          const s = PARTY_SHORT[item.party] || item.party;
          const n = item.candidate_name ? `${item.candidate_name} ` : "";
          html += `<div style="font-size:12px">${dot(c)}${n}${s}: <b>${item.support_rate}%</b></div>`;
        }
      } else {
        html += `<div style="font-size:12px;color:#aaa">暫無民調</div>`;
      }
    } else if (mapMode === "prediction") {
      const pred = predictions[code];
      if (pred) {
        const flip = flipRegions.has(code);
        if (flip) html += `<div style="font-size:11px;color:#e74c3c;font-weight:bold">⚠ 可能翻轉</div>`;
        html += `<div style="font-size:11px;color:#888">信心度 ${pred.confidence}% · ${pred.data_quality === "real_polls" ? "真實民調" : pred.data_quality === "simulated_polls" ? "模擬民調" : "歷史模型"}</div>`;
        const sorted = Object.entries(pred.predicted_rates).sort((a, b) => b[1] - a[1]);
        for (const [party, rate] of sorted) {
          if (rate < 3) continue;
          const c = PARTY_COLORS[party] || "#999";
          const s = PARTY_SHORT[party] || party;
          html += `<div style="font-size:12px">${dot(c)}${s}: <b>${rate}%</b></div>`;
        }
        html += `<div style="font-size:11px;margin-top:2px">勝率: <b>${pred.win_probability}%</b></div>`;
      }
    } else {
      const results = resultsByRegion[code];
      if (results) {
        for (const r of [...results].sort((a, b) => b.votes - a.votes).slice(0, 3)) {
          const c = PARTY_COLORS[r.candidate_party] || "#999";
          html += `<div style="font-size:12px">${dot(c)}${r.candidate_name} (${PARTY_SHORT[r.candidate_party] || r.candidate_party}): <b>${r.vote_rate?.toFixed(1)}%</b></div>`;
        }
      }
    }

    layer.bindTooltip(html, { sticky: true, direction: "top" });
  };

  const flipCount = flipRegions.size;

  return (
    <div style={{ height: "100%", minHeight: "500px", position: "relative" }}>
      {/* Mode toggle */}
      <div style={styles.modeToggle}>
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMapMode(m.key)}
            style={{
              ...styles.modeBtn,
              ...(mapMode === m.key ? styles.modeBtnActive : {}),
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(PARTY_COLORS).slice(0, 3).map(([party, color]) => (
          <div key={party} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: color }} />
            <span style={styles.legendLabel}>{PARTY_SHORT[party]}</span>
          </div>
        ))}
        {mapMode === "prediction" && flipCount > 0 && (
          <div style={styles.legendItem}>
            <span style={{
              ...styles.legendDot,
              backgroundColor: "transparent",
              border: "2px dashed #ff4444",
            }} />
            <span style={{ ...styles.legendLabel, color: "#e74c3c" }}>
              翻轉 ({flipCount})
            </span>
          </div>
        )}
      </div>

      <MapContainer
        center={[23.7, 120.96]}
        zoom={7}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        {geoData && (
          <GeoJSON
            key={`${mapMode}-${election?.id}-${selectedRegion}-${flipCount}`}
            ref={geoRef}
            data={geoData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}

const styles = {
  modeToggle: {
    position: "absolute", top: "12px", right: "12px", zIndex: 1000,
    display: "flex", gap: "2px", backgroundColor: "#fff",
    borderRadius: "8px", padding: "3px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  modeBtn: {
    padding: "6px 12px", border: "none", borderRadius: "6px",
    cursor: "pointer", fontSize: "0.78rem",
    backgroundColor: "transparent", color: "#666",
  },
  modeBtnActive: { backgroundColor: "#1a1a2e", color: "#fff" },
  legend: {
    position: "absolute", bottom: "20px", left: "12px", zIndex: 1000,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: "8px",
    padding: "10px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex", gap: "12px",
  },
  legendItem: { display: "flex", alignItems: "center", gap: "4px" },
  legendDot: {
    width: "10px", height: "10px", borderRadius: "50%",
    display: "inline-block", boxSizing: "border-box",
  },
  legendLabel: { fontSize: "0.75rem", color: "#555" },
};
