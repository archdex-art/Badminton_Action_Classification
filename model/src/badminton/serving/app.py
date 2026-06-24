"""FastAPI app exposing health + keypoint prediction.

Video upload -> pose -> predict is intentionally an async/queued path in production
(see README architecture); this app exposes the synchronous keypoint endpoint plus a
hook for the worker to reuse the same predictor.
"""

from __future__ import annotations

import logging
import os
import tempfile

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ..inference.pose import RTMPoseEstimator
from ..inference.predictor import ActionPredictor
from ..inference.video import read_video_uniform
from .schemas import HealthResponse, KeypointPredictRequest, PredictResponse

log = logging.getLogger("serving")
app = FastAPI(title="Badminton Action Classification", version="0.1.0")

# Allow the Next.js app (and curl) to call the model server during local dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH", "")
MODEL_VERSION = os.getenv("MODEL_VERSION", "dev")
POSE_FRAMES = int(os.getenv("POSE_FRAMES", "24"))
POSE_MODE = os.getenv("POSE_MODE", "balanced")  # lightweight | balanced | performance
POSE_DEVICE = os.getenv("POSE_DEVICE", "cpu")  # cpu | cuda | mps
_predictor: ActionPredictor | None = None
_pose: RTMPoseEstimator | None = None


def get_predictor() -> ActionPredictor | None:
    global _predictor
    if _predictor is None and MODEL_PATH and os.path.exists(MODEL_PATH):
        log.info("loading model from %s", MODEL_PATH)
        _predictor = ActionPredictor.from_checkpoint(MODEL_PATH)
    return _predictor


def get_pose() -> RTMPoseEstimator:
    """Lazily construct the RTMPose estimator (models download on first use)."""
    global _pose
    if _pose is None:
        _pose = RTMPoseEstimator(mode=POSE_MODE, device=POSE_DEVICE)
    return _pose


@app.on_event("startup")
def _startup() -> None:
    get_predictor()


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=get_predictor() is not None,
        model_version=MODEL_VERSION,
    )


@app.post("/v1/predict/keypoints", response_model=PredictResponse)
def predict_keypoints(req: KeypointPredictRequest) -> PredictResponse:
    predictor = get_predictor()
    if predictor is None:
        raise HTTPException(status_code=503, detail="model not loaded")
    arr = np.asarray(req.keypoints, dtype=np.float32)
    if arr.ndim != 3 or arr.shape[1] != 17 or arr.shape[2] != 3:
        raise HTTPException(status_code=422, detail="keypoints must be [num_frames, 17, 3]")
    result = predictor.predict(arr)
    return PredictResponse(
        label=result.label,
        confidence=result.confidence,
        abstain=result.abstain,
        probabilities=result.probabilities,
        model_version=MODEL_VERSION,
    )


@app.post("/v1/predict/video", response_model=PredictResponse)
async def predict_video(clip: UploadFile = File(...)) -> PredictResponse:
    """Full pipeline: uploaded video -> RTMPose keypoints -> calibrated prediction."""
    predictor = get_predictor()
    if predictor is None:
        raise HTTPException(status_code=503, detail="model not loaded")

    suffix = os.path.splitext(clip.filename or "")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await clip.read())
        path = tmp.name

    try:
        frames = read_video_uniform(path, POSE_FRAMES)
        keypoints = get_pose().estimate(frames)
        result = predictor.predict(keypoints)
    except (OSError, ValueError) as e:
        raise HTTPException(status_code=422, detail=f"could not process video: {e}") from e
    finally:
        try:
            os.remove(path)
        except OSError:
            pass

    return PredictResponse(
        label=result.label,
        confidence=result.confidence,
        abstain=result.abstain,
        probabilities=result.probabilities,
        model_version=MODEL_VERSION,
    )
