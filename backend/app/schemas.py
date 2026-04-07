from pydantic import BaseModel


class ElectionOut(BaseModel):
    id: int
    year: int
    type: str
    name: str
    date: str | None
    total_voters: int | None
    total_votes: int | None
    turnout_rate: float | None

    model_config = {"from_attributes": True}


class CandidateOut(BaseModel):
    id: int
    election_id: int
    number: int | None
    name: str
    party: str | None
    vice_name: str | None
    total_votes: int | None
    vote_rate: float | None
    elected: int

    model_config = {"from_attributes": True}


class RegionOut(BaseModel):
    id: int
    code: str
    name: str
    level: str
    parent_code: str | None
    population: int | None
    latitude: float | None
    longitude: float | None

    model_config = {"from_attributes": True}


class RegionResultOut(BaseModel):
    id: int
    election_id: int
    region_code: str
    candidate_id: int
    votes: int
    vote_rate: float | None
    turnout_rate: float | None
    candidate_name: str | None = None
    candidate_party: str | None = None

    model_config = {"from_attributes": True}


class ElectionDetailOut(ElectionOut):
    candidates: list[CandidateOut]


class RegionHistoryItem(BaseModel):
    year: int
    election_name: str
    election_type: str
    results: list[RegionResultOut]


class CompareRequest(BaseModel):
    election_ids: list[int]
    region_codes: list[str] | None = None


class CompareItem(BaseModel):
    election: ElectionOut
    region_code: str
    region_name: str
    results: list[RegionResultOut]


class PartyTrendItem(BaseModel):
    year: int
    election_name: str
    party: str
    total_votes: int
    vote_rate: float
