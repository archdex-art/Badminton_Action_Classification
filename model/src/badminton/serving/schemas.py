"""Request/response contracts for the inference API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class KeypointPredictRequest(BaseModel):
    """Predict directly from pre-extracted keypoints (pose done client-side/upstream)."""

    keypoints: list[list[list[float]]] = Field(
        ..., description="[num_frames, 17, 3] (x, y, confidence)"
    )


class PredictResponse(BaseModel):
    label: str
    confidence: float
    abstain: bool
    probabilities: dict[str, float]
    model_version: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: str
