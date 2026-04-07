import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { getElectionResults } from "../api/client";

const PARTY_COLORS = {
  民主進步黨: "#1B9431",
  中國國民黨: "#000095",
  台灣民眾黨: "#28C8C8",
  親民黨: "#FF6310",
  新黨: "#FEDE00",
  無黨籍: "#999999",
};

export default function ElectionMap({
  election,
  regions,
  selectedRegion,
  onSelectRegion,
}) {
  const [resultsByRegion, setResultsByRegion] = useState({});

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

  const getWinnerColor = (regionCode) => {
    const results = resultsByRegion[regionCode];
    if (!results || results.length === 0) return "#ccc";
    const winner = results.reduce((a, b) => (a.votes > b.votes ? a : b));
    return PARTY_COLORS[winner.candidate_party] || "#999";
  };

  const getWinnerInfo = (regionCode) => {
    const results = resultsByRegion[regionCode];
    if (!results || results.length === 0) return null;
    const sorted = [...results].sort((a, b) => b.votes - a.votes);
    return sorted;
  };

  return (
    <div style={{ height: "100%", minHeight: "500px", borderRadius: "12px", overflow: "hidden" }}>
      <MapContainer
        center={[23.7, 120.96]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {regions.map((region) => {
          if (!region.latitude || !region.longitude) return null;
          const isSelected = selectedRegion === region.code;
          const color = getWinnerColor(region.code);
          const info = getWinnerInfo(region.code);

          return (
            <CircleMarker
              key={region.code}
              center={[region.latitude, region.longitude]}
              radius={isSelected ? 16 : Math.max(8, Math.sqrt((region.population || 500000) / 50000))}
              pathOptions={{
                fillColor: color,
                fillOpacity: isSelected ? 0.9 : 0.7,
                color: isSelected ? "#fff" : color,
                weight: isSelected ? 3 : 1,
              }}
              eventHandlers={{
                click: () => onSelectRegion(region.code),
              }}
            >
              <Tooltip>
                <div>
                  <strong>{region.name}</strong>
                  {info && (
                    <div style={{ fontSize: "12px", marginTop: "4px" }}>
                      {info.slice(0, 3).map((r, i) => (
                        <div key={i}>
                          {r.candidate_name} ({r.candidate_party}): {r.vote_rate?.toFixed(1)}%
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
