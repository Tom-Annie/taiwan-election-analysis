import React, { useEffect, useState } from "react";
import {
  getPollSummary,
  getRegionPolls,
} from "../api/client";
import axios from "axios";

const api = axios.create({ baseURL: "/api" });

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

const PARTIES = ["民主進步黨", "中國國民黨", "台灣民眾黨", "無黨籍"];

const EMPTY_FORM = {
  region_code: "",
  date: new Date().toISOString().slice(0, 10),
  source: "",
  sample_size: "",
  margin_of_error: "",
  items: PARTIES.map((p) => ({ party: p, candidate_name: "", support_rate: "" })),
};

export default function PollAdmin({ regions }) {
  const [summary, setSummary] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionPolls, setRegionPolls] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const refresh = () => {
    getPollSummary().then(setSummary);
    if (selectedRegion) {
      getRegionPolls(selectedRegion).then(setRegionPolls);
    }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (selectedRegion) {
      getRegionPolls(selectedRegion).then(setRegionPolls);
      setForm({ ...EMPTY_FORM, region_code: selectedRegion });
      setEditingId(null);
    }
  }, [selectedRegion]);

  const flash = (msg, ms = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), ms);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      region_code: form.region_code,
      date: form.date,
      source: form.source,
      sample_size: form.sample_size ? Number(form.sample_size) : null,
      margin_of_error: form.margin_of_error ? Number(form.margin_of_error) : null,
      is_simulated: 0,
      items: form.items
        .filter((it) => it.support_rate !== "" && Number(it.support_rate) > 0)
        .map((it) => ({
          party: it.party,
          candidate_name: it.candidate_name || null,
          support_rate: Number(it.support_rate),
        })),
    };

    if (payload.items.length === 0) {
      flash("請至少輸入一個政黨的支持率");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/polls/${editingId}`, payload);
        flash("已更新民調");
      } else {
        await api.post("/polls/", payload);
        flash("已新增民調");
      }
      setForm({ ...EMPTY_FORM, region_code: form.region_code });
      setEditingId(null);
      refresh();
    } catch (err) {
      flash("錯誤: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (poll) => {
    setEditingId(poll.id);
    setForm({
      region_code: poll.region_code,
      date: poll.date,
      source: poll.source,
      sample_size: poll.sample_size || "",
      margin_of_error: poll.margin_of_error || "",
      items: PARTIES.map((p) => {
        const existing = poll.items.find((it) => it.party === p);
        return {
          party: p,
          candidate_name: existing?.candidate_name || "",
          support_rate: existing?.support_rate ?? "",
        };
      }),
    });
  };

  const handleDelete = async (id) => {
    await api.delete(`/polls/${id}`);
    flash("已刪除");
    refresh();
  };

  const handleDeleteSimulated = async () => {
    const res = await api.delete("/polls/simulated/all");
    flash(`已清除 ${res.data.deleted} 筆模擬資料`);
    refresh();
  };

  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(bulkText);
      const polls = Array.isArray(parsed) ? parsed : [parsed];
      const res = await api.post("/polls/bulk", { polls });
      flash(`已匯入 ${res.data.created} 筆民調`);
      setBulkText("");
      setShowBulk(false);
      refresh();
    } catch (err) {
      if (err instanceof SyntaxError) {
        flash("JSON 格式錯誤，請檢查");
      } else {
        flash("匯入失敗: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const updateItem = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setForm({ ...form, items: newItems });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>民調管理</h2>
          <p style={styles.subtitle}>新增、編輯、刪除民調資料</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => setShowBulk(!showBulk)} style={styles.actionBtn}>
            {showBulk ? "關閉" : "JSON 批次匯入"}
          </button>
          <button onClick={handleDeleteSimulated} style={styles.dangerBtn}>
            清除模擬資料
          </button>
        </div>
      </div>

      {message && <div style={styles.flash}>{message}</div>}

      {/* Bulk import */}
      {showBulk && (
        <div style={styles.bulkSection}>
          <h4 style={styles.sectionTitle}>JSON 批次匯入</h4>
          <p style={styles.bulkHint}>
            格式: {`[{"region_code":"TPE","date":"2026-04-10","source":"TVBS","sample_size":1000,"margin_of_error":3.1,"items":[{"party":"民主進步黨","candidate_name":"...","support_rate":35.2},...]}]`}
          </p>
          <textarea
            style={styles.textarea}
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="貼上 JSON..."
          />
          <button onClick={handleBulkImport} style={styles.submitBtn}>匯入</button>
        </div>
      )}

      <div style={styles.body}>
        {/* Left: region list */}
        <div style={styles.regionList}>
          <h4 style={styles.sectionTitle}>選擇縣市</h4>
          {summary.map((s) => (
            <div
              key={s.region_code}
              onClick={() => setSelectedRegion(s.region_code)}
              style={{
                ...styles.regionItem,
                ...(selectedRegion === s.region_code ? styles.regionItemActive : {}),
              }}
            >
              <div style={styles.regionName}>{s.region_name}</div>
              <div style={styles.regionMeta}>
                {s.real_poll_count > 0 ? (
                  <span style={styles.realBadge}>{s.real_poll_count} 真實</span>
                ) : null}
                {s.poll_count - s.real_poll_count > 0 ? (
                  <span style={styles.simBadge}>
                    {s.poll_count - s.real_poll_count} 模擬
                  </span>
                ) : null}
                {s.poll_count === 0 && <span style={styles.noBadge}>無資料</span>}
              </div>
              {s.leading_party && (
                <div style={{
                  fontSize: "0.75rem",
                  color: PARTY_COLORS[s.leading_party] || "#999",
                  fontWeight: "bold",
                }}>
                  {PARTY_SHORT[s.leading_party]} {s.leading_rate}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: form + poll list */}
        <div style={styles.rightPanel}>
          {selectedRegion ? (
            <>
              {/* Input form */}
              <form onSubmit={handleSubmit} style={styles.form}>
                <h4 style={styles.sectionTitle}>
                  {editingId ? "編輯民調" : "新增民調"} —{" "}
                  {regions?.find((r) => r.code === selectedRegion)?.name}
                </h4>

                <div style={styles.formRow}>
                  <label style={styles.label}>
                    日期
                    <input
                      type="date"
                      style={styles.input}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </label>
                  <label style={styles.label}>
                    民調機構
                    <input
                      type="text"
                      style={styles.input}
                      value={form.source}
                      onChange={(e) => setForm({ ...form, source: e.target.value })}
                      placeholder="例: TVBS民調中心"
                      required
                    />
                  </label>
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>
                    樣本數
                    <input
                      type="number"
                      style={styles.input}
                      value={form.sample_size}
                      onChange={(e) => setForm({ ...form, sample_size: e.target.value })}
                      placeholder="1000"
                    />
                  </label>
                  <label style={styles.label}>
                    誤差 (%)
                    <input
                      type="number"
                      step="0.1"
                      style={styles.input}
                      value={form.margin_of_error}
                      onChange={(e) => setForm({ ...form, margin_of_error: e.target.value })}
                      placeholder="3.1"
                    />
                  </label>
                </div>

                <div style={styles.partyInputs}>
                  {form.items.map((item, idx) => (
                    <div key={item.party} style={styles.partyRow}>
                      <span style={{
                        ...styles.partyDot,
                        backgroundColor: PARTY_COLORS[item.party] || "#999",
                      }} />
                      <span style={styles.partyName}>
                        {PARTY_SHORT[item.party] || item.party}
                      </span>
                      <input
                        type="text"
                        style={styles.inputSmall}
                        value={item.candidate_name}
                        onChange={(e) => updateItem(idx, "candidate_name", e.target.value)}
                        placeholder="候選人"
                      />
                      <input
                        type="number"
                        step="0.1"
                        style={styles.inputSmall}
                        value={item.support_rate}
                        onChange={(e) => updateItem(idx, "support_rate", e.target.value)}
                        placeholder="支持率%"
                      />
                    </div>
                  ))}
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.submitBtn}>
                    {editingId ? "更新" : "新增"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setForm({ ...EMPTY_FORM, region_code: selectedRegion });
                      }}
                      style={styles.cancelBtn}
                    >
                      取消
                    </button>
                  )}
                </div>
              </form>

              {/* Existing polls */}
              <div style={styles.pollList}>
                <h4 style={styles.sectionTitle}>已有民調</h4>
                {regionPolls.length === 0 && (
                  <p style={{ color: "#aaa" }}>此縣市尚無民調資料</p>
                )}
                {regionPolls.map((poll) => (
                  <div
                    key={poll.id}
                    style={{
                      ...styles.pollCard,
                      ...(poll.is_simulated ? styles.simulated : {}),
                    }}
                  >
                    <div style={styles.pollHeader}>
                      <strong>{poll.source}</strong>
                      <span style={styles.pollDate}>{poll.date}</span>
                      {poll.is_simulated ? (
                        <span style={styles.simTag}>模擬</span>
                      ) : (
                        <span style={styles.realTag}>真實</span>
                      )}
                      <div style={styles.pollActions}>
                        <button
                          onClick={() => handleEdit(poll)}
                          style={styles.editBtn}
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(poll.id)}
                          style={styles.deleteBtn}
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                    <div style={styles.pollItems}>
                      {poll.items
                        ?.sort((a, b) => b.support_rate - a.support_rate)
                        .map((item, i) => (
                          <div key={i} style={styles.pollItemRow}>
                            <span style={{
                              ...styles.partyDot,
                              backgroundColor: PARTY_COLORS[item.party] || "#999",
                            }} />
                            <span style={styles.itemParty}>
                              {item.candidate_name ? `${item.candidate_name} ` : ""}
                              ({PARTY_SHORT[item.party] || item.party})
                            </span>
                            <div style={styles.itemBarBg}>
                              <div style={{
                                ...styles.itemBarFill,
                                width: `${item.support_rate * 1.5}%`,
                                backgroundColor: PARTY_COLORS[item.party] || "#999",
                              }} />
                            </div>
                            <strong style={styles.itemRate}>{item.support_rate}%</strong>
                          </div>
                        ))}
                    </div>
                    {poll.sample_size && (
                      <div style={styles.pollMeta}>
                        n={poll.sample_size}
                        {poll.margin_of_error && ` ±${poll.margin_of_error}%`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={styles.placeholder}>
              <p>請從左側選擇縣市</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { backgroundColor: "#fff", borderRadius: "12px", padding: "20px" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: "16px", flexWrap: "wrap", gap: "12px",
  },
  title: { margin: 0, fontSize: "1.2rem" },
  subtitle: { margin: "4px 0 0", fontSize: "0.8rem", color: "#888" },
  headerActions: { display: "flex", gap: "8px" },
  actionBtn: {
    padding: "8px 16px", borderRadius: "6px", border: "1px solid #ddd",
    backgroundColor: "#fff", cursor: "pointer", fontSize: "0.85rem",
  },
  dangerBtn: {
    padding: "8px 16px", borderRadius: "6px", border: "none",
    backgroundColor: "#e74c3c", color: "#fff", cursor: "pointer", fontSize: "0.85rem",
  },
  flash: {
    padding: "10px 16px", borderRadius: "8px", backgroundColor: "#d4edda",
    color: "#155724", marginBottom: "16px", fontSize: "0.9rem",
  },

  // Bulk
  bulkSection: {
    padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "10px", marginBottom: "16px",
  },
  bulkHint: { fontSize: "0.75rem", color: "#888", marginBottom: "8px", wordBreak: "break-all" },
  textarea: {
    width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ddd",
    fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical", boxSizing: "border-box",
  },

  // Body layout
  body: { display: "flex", gap: "16px", minHeight: "500px" },
  regionList: {
    width: "200px", flexShrink: 0, overflowY: "auto",
    maxHeight: "600px", paddingRight: "8px",
  },
  rightPanel: { flex: 1, overflowY: "auto" },
  sectionTitle: { fontSize: "0.85rem", color: "#666", marginBottom: "10px" },

  // Region items
  regionItem: {
    padding: "10px", borderRadius: "8px", cursor: "pointer",
    marginBottom: "4px", transition: "all 0.15s",
  },
  regionItemActive: { backgroundColor: "#e8f0fe" },
  regionName: { fontWeight: "bold", fontSize: "0.9rem" },
  regionMeta: { display: "flex", gap: "4px", marginTop: "2px" },
  realBadge: {
    fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px",
    backgroundColor: "#d4edda", color: "#155724",
  },
  simBadge: {
    fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px",
    backgroundColor: "#fff3cd", color: "#856404",
  },
  noBadge: {
    fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px",
    backgroundColor: "#f8d7da", color: "#721c24",
  },

  // Form
  form: {
    padding: "16px", backgroundColor: "#f8f9fa", borderRadius: "10px", marginBottom: "16px",
  },
  formRow: { display: "flex", gap: "12px", marginBottom: "10px" },
  label: { flex: 1, display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.8rem", color: "#555" },
  input: {
    padding: "8px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "0.9rem",
  },
  partyInputs: { marginBottom: "12px" },
  partyRow: {
    display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px",
  },
  partyDot: { width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0 },
  partyName: { width: "55px", fontSize: "0.85rem", fontWeight: "bold" },
  inputSmall: {
    flex: 1, padding: "7px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "0.85rem",
  },
  formActions: { display: "flex", gap: "8px" },
  submitBtn: {
    padding: "8px 24px", borderRadius: "6px", border: "none",
    backgroundColor: "#1a1a2e", color: "#fff", cursor: "pointer", fontSize: "0.9rem",
  },
  cancelBtn: {
    padding: "8px 24px", borderRadius: "6px", border: "1px solid #ddd",
    backgroundColor: "#fff", cursor: "pointer", fontSize: "0.9rem",
  },

  // Poll list
  pollList: { marginTop: "8px" },
  pollCard: {
    padding: "14px", borderRadius: "10px", backgroundColor: "#f8f9fa",
    marginBottom: "10px", border: "1px solid #eee",
  },
  simulated: { opacity: 0.7, borderStyle: "dashed" },
  pollHeader: {
    display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px",
    fontSize: "0.9rem", flexWrap: "wrap",
  },
  pollDate: { color: "#888" },
  simTag: {
    fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px",
    backgroundColor: "#fff3cd", color: "#856404",
  },
  realTag: {
    fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px",
    backgroundColor: "#d4edda", color: "#155724",
  },
  pollActions: { marginLeft: "auto", display: "flex", gap: "4px" },
  editBtn: {
    padding: "4px 10px", borderRadius: "4px", border: "1px solid #ddd",
    backgroundColor: "#fff", cursor: "pointer", fontSize: "0.75rem",
  },
  deleteBtn: {
    padding: "4px 10px", borderRadius: "4px", border: "none",
    backgroundColor: "#e74c3c", color: "#fff", cursor: "pointer", fontSize: "0.75rem",
  },
  pollItems: { marginBottom: "6px" },
  pollItemRow: {
    display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px",
  },
  itemParty: { width: "150px", fontSize: "0.8rem" },
  itemBarBg: {
    flex: 1, height: "14px", backgroundColor: "#e9ecef",
    borderRadius: "3px", overflow: "hidden",
  },
  itemBarFill: { height: "100%", borderRadius: "3px" },
  itemRate: { width: "45px", textAlign: "right", fontSize: "0.85rem" },
  pollMeta: { fontSize: "0.7rem", color: "#aaa" },
  placeholder: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: "300px", color: "#aaa",
  },
};
