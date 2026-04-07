import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ElectionMap from "./components/ElectionMap";
import TrendChart from "./components/TrendChart";
import ComparePanel from "./components/ComparePanel";
import PredictionPanel from "./components/PredictionPanel";
import PollPanel from "./components/PollPanel";
import PollAdmin from "./components/PollAdmin";
import LegislativePanel from "./components/LegislativePanel";
import { getElections, getElection, getRegions } from "./api/client";

const TABS = ["總覽", "地圖", "國會", "民調", "趨勢", "比較", "2026預測", "管理"];

// Tabs that don't need the sidebar
const NO_SIDEBAR = ["總覽", "國會", "2026預測", "管理"];

export default function App() {
  const [elections, setElections] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [activeTab, setActiveTab] = useState("總覽");

  useEffect(() => {
    getElections().then(setElections).catch(console.error);
    getRegions("city").then(setRegions).catch(console.error);
  }, []);

  useEffect(() => {
    if (elections.length > 0 && !selectedElection) {
      getElection(elections[0].id).then(setSelectedElection);
    }
  }, [elections]);

  const handleSelectElection = async (id) => {
    const detail = await getElection(id);
    setSelectedElection(detail);
  };

  const showSidebar = !NO_SIDEBAR.includes(activeTab);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>台灣選舉分析系統</h1>
        <nav style={styles.nav}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <div style={styles.body}>
        {showSidebar && (
          <Sidebar
            elections={elections}
            selectedElection={selectedElection}
            onSelectElection={handleSelectElection}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            regions={regions}
          />
        )}

        <main style={styles.main}>
          {activeTab === "總覽" && <Dashboard />}
          {activeTab === "地圖" && (
            <ElectionMap
              election={selectedElection}
              regions={regions}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
            />
          )}
          {activeTab === "國會" && <LegislativePanel />}
          {activeTab === "民調" && <PollPanel regions={regions} />}
          {activeTab === "趨勢" && (
            <TrendChart
              elections={elections}
              selectedRegion={selectedRegion}
              regions={regions}
            />
          )}
          {activeTab === "比較" && (
            <ComparePanel elections={elections} regions={regions} />
          )}
          {activeTab === "2026預測" && <PredictionPanel />}
          {activeTab === "管理" && <PollAdmin regions={regions} />}
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    margin: 0,
    backgroundColor: "#f5f5f5",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    backgroundColor: "#1a1a2e",
    color: "#fff",
  },
  title: { margin: 0, fontSize: "1.3rem" },
  nav: { display: "flex", gap: "4px", flexWrap: "wrap" },
  tabBtn: {
    padding: "8px 16px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
    backgroundColor: "transparent",
    color: "#aaa",
    transition: "all 0.2s",
  },
  tabActive: {
    backgroundColor: "#16213e",
    color: "#fff",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  main: {
    flex: 1,
    overflow: "auto",
    padding: "16px",
  },
};
