"""Lightweight video frame reader (OpenCV-backed).

Kept separate from pose so the pose backend stays I/O-agnostic and easy to test.
"""

from __future__ import annotations

import numpy as np


def read_video(path: str, max_frames: int | None = None, stride: int = 1) -> np.ndarray:
    """Decode a video to ``[T, H, W, 3]`` uint8 RGB.

    ``stride`` subsamples every Nth frame; ``max_frames`` caps the count (after stride).
    """
    import cv2  # local import: heavy, and not needed for keypoint-only paths

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise OSError(f"cannot open video: {path}")
    frames: list[np.ndarray] = []
    i = 0
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % stride == 0:
                frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                if max_frames is not None and len(frames) >= max_frames:
                    break
            i += 1
    finally:
        cap.release()
    if not frames:
        raise ValueError(f"no frames decoded from {path}")
    return np.stack(frames)


def read_video_uniform(path: str, num_frames: int) -> np.ndarray:
    """Decode ``num_frames`` evenly spaced across the WHOLE clip -> ``[num_frames, H, W, 3]``.

    Decoding every frame is cheap; pose inference is the cost, so we decode all frames
    (sequentially, robust across codecs) and keep only an evenly-spaced subset. This
    guarantees the full action — crucially the swing apex — is covered regardless of clip
    length, at a fixed pose-inference budget.
    """
    import cv2

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise OSError(f"cannot open video: {path}")
    frames: list[np.ndarray] = []
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    finally:
        cap.release()
    if not frames:
        raise ValueError(f"no frames decoded from {path}")

    total = len(frames)
    if total <= num_frames:
        idx = np.arange(total)
    else:
        idx = np.linspace(0, total - 1, num_frames).round().astype(int)
    return np.stack([frames[i] for i in idx])
