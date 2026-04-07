from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.prediction import predict_all, predict_region, get_prediction_summary

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/")
def list_predictions(db: Session = Depends(get_db)):
    return predict_all(db)


@router.get("/summary")
def prediction_summary(db: Session = Depends(get_db)):
    return get_prediction_summary(db)


@router.get("/{region_code}")
def get_region_prediction(region_code: str, db: Session = Depends(get_db)):
    result = predict_region(db, region_code)
    if not result:
        return {"error": "Region not found"}
    return result
