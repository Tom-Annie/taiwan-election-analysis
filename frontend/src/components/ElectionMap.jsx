import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Tooltip } from "react-leaflet";
import { getElectionResults, getPollSummary } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  親民黨: "#FF6310",
  無黨籍: "#999999",
};

const PARTY_SHORT = {
  民主進步黨: "民進黨",
  中國國民黨: "國民黨",
  台灣民眾黨: "民眾黨",
};

export default function ElectionMap({
  election,
  regions,
  selectedRegion,
  onSelectRegion,
}) {
  const [geoData, setGeoData] = useState(null);
  const [resultsByRegion, setResultsByRegion] = useState({});
  const [pollSummary, setPollSummary] = useState({});
  const [mapMode, setMapMode] = useState("election"); // election | poll
  const geoRef = useRef(null);

  // Load GeoJSON
  useEffect(() => {
    fetch("/tw-counties.json")
      .then((r) => r.json())
      .then(setGeoData)
      .catch(console.error);
  }, []);

  // Load election results
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

  // Load poll summary
  useEffect(() => {
    getPollSummary().then((data) => {
      const map = {};
      for (const item of data) {
        map[item.region_code] = item;
      }
      setPollSummary(map);
    }).catch(console.error);
  }, []);

  // Force GeoJSON re-render when data changes
  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.clearLayers();
      if (geoData) geoRef.current.addData(geoData);
    }
  }, [resultsByRegion, pollSummary, mapMode, selectedRegion, geoData]);

  const getRegionColor = (code) => {
    if (mapMode === "poll") {
      const poll = pollSummary[code];
      if (poll?.leading_party) {
        return PARTY_COLORS[poll.leading_party] || "#ccc";
      }
      return "#ccc";
    }

    const results = resultsByRegion[code];
    if (!results || results.length === 0) return "#ccc";
    const winner = results.reduce((a, b) => (a.votes > b.votes ? a : b));
    return PARTY_COLORS[winner.candidate_party] || "#ccc";
  };

  const style = (feature) => {
    const code = feature.properties.code;
    const isSelected = selectedRegion === code;
    return {
      fillColor: getRegionColor(code),
      fillOpacity: isSelected ? 0.85 : 0.6,
      color: isSelected ? "#fff" : "#333",
      weight: isSelected ? 3 : 1,
      opacity: 1,
    };
  };

  const onEachFeature = (feature, layer) => {
    const code = feature.properties.code;
    const name = feature.properties.name;

    layer.on({
      click: () => onSelectRegion(code),
      mouseover: (e) => {
        e.target.setStyle({ fillOpacity: 0.85, weight: 2 });
      },
      mouseout: (e) => {
        if (selectedRegion !== code) {
          e.target.setStyle({ fillOpacity: 0.6, weight: 1 });
        }
      },
    });

    // Build tooltip content
    let tooltipHtml = `<strong>${name}</strong>`;

    if (mapMode === "poll") {
      const poll = pollSummary[code];
      if (poll?.latest_poll) {
        tooltipHtml += `<div style="font-size:11px;color:#888;margin:2px 0">${poll.latest_poll.source} (${poll.latest_poll.date})</div>`;
        const items = [...poll.latest_poll.items].sort(
          (a, b) => b.support_rate - a.support_rate
        );
        for (const item of items) {
          const pColor = PARTY_COLORS[item.party] || "#999";
          const short = PARTY_SHORT[item.party] || item.party;
          const name = item.candidate_name ? `${item.candidate_name} ` : "";
          tooltipHtml += `<div style="font-size:12px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${pColor};margin-right:4px"></span>${name}${short}: <b>${item.support_rate}%</b></div>`;
        }
      } else {
        tooltipHtml += `<div style="font-size:12px;color:#aaa">暫無民調資料</div>`;
      }
    } else {
      const results = resultsByRegion[code];
      if (results) {
        const sorted = [...results].sort((a, b) => b.votes - a.votes);
        for (const r of sorted.slice(0, 3)) {
          const pColor = PARTY_COLORS[r.candidate_party] || "#999";
          tooltipHtml += `<div style="font-size:12px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${pColor};margin-right:4px"></span>${r.candidate_name} (${PARTY_SHORT[r.candidate_party] || r.candidate_party}): <b>${r.vote_rate?.toFixed(1)}%</b></div>`;
        }
      }
    }

    layer.bindTooltip(tooltipHtml, { sticky: true, direction: "top" });
  };

  return (
    <div style={{ height: "100%", minHeight: "500px", position: "relative" }}>
      {/* Mode toggle */}
      <div style={styles.modeToggle}>
        <button
          onClick={() => setMapMode("election")}
          style={{
            ...styles.modeBtn,
            ...(mapMode === "election" ? styles.modeBtnActive : {}),
          }}
        >
          選舉結果
        </button>
        <button
          onClick={() => setMapMode("poll")}
          style={{
            ...styles.modeBtn,
            ...(mapMode === "poll" ? styles.modeBtnActive : {}),
          }}
        >
          最新民調
        </button>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {Object.entries(PARTY_COLORS).slice(0, 3).map(([party, color]) => (
          <div key={party} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: color }} />
            <span style={styles.legendLabel}>{PARTY_SHORT[party] || party}</span>
          </div>
        ))}
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
            key={`${mapMode}-${election?.id}-${selectedRegion}`}
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
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 1000,
    display: "flex",
    gap: "2px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    padding: "3px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  },
  modeBtn: {
    padding: "6px 14px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.8rem",
    backgroundColor: "transparent",
    color: "#666",
  },
  modeBtnActive: {
    backgroundColor: "#1a1a2e",
    color: "#fff",
  },
  legend: {
    position: "absolute",
    bottom: "20px",
    left: "12px",
    zIndex: 1000,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: "8px",
    padding: "10px 14px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    gap: "12px",
  },
  legendItem: { display: "flex", alignItems: "center", gap: "4px" },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    display: "inline-block",
  },
  legendLabel: { fontSize: "0.75rem", color: "#555" },
};
