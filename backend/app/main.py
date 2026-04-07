from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import elections, regions, compare, prediction, polls

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="台灣選舉分析系統",
    description="Taiwan Election Analysis API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(elections.router)
app.include_router(regions.router)
app.include_router(compare.router)
app.include_router(prediction.router)
app.include_router(polls.router)


@app.get("/")
def root():
    return {"message": "台灣選舉分析系統 API", "docs": "/docs"}
