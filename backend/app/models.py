from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class Election(Base):
    """選舉基本資料"""
    __tablename__ = "elections"

    id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    type = Column(String, nullable=False)  # presidential, legislative, local
    name = Column(String, nullable=False)  # e.g. "第16任總統副總統選舉"
    date = Column(String)
    total_voters = Column(Integer)
    total_votes = Column(Integer)
    turnout_rate = Column(Float)

    candidates = relationship("Candidate", back_populates="election")
    results = relationship("RegionResult", back_populates="election")


class Candidate(Base):
    """候選人 / 政黨"""
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    number = Column(Integer)  # 號次
    name = Column(String, nullable=False)
    party = Column(String)
    vice_name = Column(String)  # 副總統候選人
    total_votes = Column(Integer)
    vote_rate = Column(Float)
    elected = Column(Integer, default=0)

    election = relationship("Election", back_populates="candidates")


class Region(Base):
    """行政區"""
    __tablename__ = "regions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)  # e.g. "TPE", "NTC"
    name = Column(String, nullable=False)  # e.g. "臺北市"
    level = Column(String, nullable=False)  # city, district
    parent_code = Column(String, ForeignKey("regions.code"), nullable=True)
    population = Column(Integer)
    latitude = Column(Float)
    longitude = Column(Float)

    results = relationship("RegionResult", back_populates="region")


class RegionResult(Base):
    """各區域選舉結果"""
    __tablename__ = "region_results"

    id = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    region_code = Column(String, ForeignKey("regions.code"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)
    votes = Column(Integer, nullable=False)
    vote_rate = Column(Float)
    turnout_rate = Column(Float)

    __table_args__ = (
        UniqueConstraint("election_id", "region_code", "candidate_id"),
    )

    election = relationship("Election", back_populates="results")
    region = relationship("Region", back_populates="results")
    candidate = relationship("Candidate")


class Poll(Base):
    """民調資料"""
    __tablename__ = "polls"

    id = Column(Integer, primary_key=True, index=True)
    region_code = Column(String, ForeignKey("regions.code"), nullable=False)
    election_type = Column(String, nullable=False)  # local, presidential
    date = Column(String, nullable=False)  # 民調日期
    source = Column(String, nullable=False)  # 民調機構
    sample_size = Column(Integer)
    margin_of_error = Column(Float)
    is_simulated = Column(Integer, default=0)  # 0=真實, 1=模擬

    items = relationship("PollItem", back_populates="poll", cascade="all, delete-orphan")
    region = relationship("Region")


class PollItem(Base):
    """民調各候選人/政黨數據"""
    __tablename__ = "poll_items"

    id = Column(Integer, primary_key=True, index=True)
    poll_id = Column(Integer, ForeignKey("polls.id"), nullable=False)
    candidate_name = Column(String)
    party = Column(String, nullable=False)
    support_rate = Column(Float, nullable=False)

    poll = relationship("Poll", back_populates="items")
