import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export async function getElections(params) {
  const res = await api.get("/elections/", { params });
  return res.data;
}

export async function getElection(id) {
  const res = await api.get(`/elections/${id}`);
  return res.data;
}

export async function getElectionResults(id, regionCode) {
  const params = regionCode ? { region_code: regionCode } : {};
  const res = await api.get(`/elections/${id}/results`, { params });
  return res.data;
}

export async function getPartyTrend(type = "presidential") {
  const res = await api.get("/elections/parties/trend", { params: { type } });
  return res.data;
}

export async function getRegions(level) {
  const params = level ? { level } : {};
  const res = await api.get("/regions/", { params });
  return res.data;
}

export async function getRegionHistory(code, type) {
  const params = type ? { type } : {};
  const res = await api.get(`/regions/${code}/history`, { params });
  return res.data;
}

export async function compareElections(electionIds, regionCodes) {
  const res = await api.post("/compare/", {
    election_ids: electionIds,
    region_codes: regionCodes || null,
  });
  return res.data;
}

export async function getPredictions() {
  const res = await api.get("/predictions/");
  return res.data;
}

export async function getPredictionSummary() {
  const res = await api.get("/predictions/summary");
  return res.data;
}

export async function getRegionPrediction(code) {
  const res = await api.get(`/predictions/${code}`);
  return res.data;
}

export async function getPollSummary() {
  const res = await api.get("/polls/summary");
  return res.data;
}

export async function getRegionPolls(code) {
  const res = await api.get(`/polls/${code}`);
  return res.data;
}

export async function getPollTrend(code) {
  const res = await api.get(`/polls/${code}/trend`);
  return res.data;
}

export async function getDashboard() {
  const res = await api.get("/dashboard/");
  return res.data;
}

export async function getLegislativeSeats() {
  const res = await api.get("/legislative/seats");
  return res.data;
}

export async function getLegislativeTrend() {
  const res = await api.get("/legislative/trend");
  return res.data;
}
