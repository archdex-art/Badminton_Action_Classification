# Project Tracker — Badminton Action Classification

Status: ✅ Done · 🟡 Partial · ⬜ Not started · Last updated: 2026-06-24

## Roll-up

| Phase | Status | Notes |
|---|---|---|
| P0 Foundation (repo, config, CI, tests) | ✅ | 20 tests, lint clean |
| P1 Modeling (features, models, CV, results) | ✅ | ST-GCN CV 0.502±0.059; BiLSTM deployed test 0.566 |
| P2 Serving (API, pose, async) | 🟡 | keypoint API done; video/async path designed |
| P3 MLOps (registry, monitoring, retraining) | 🟡 | tracking + calibration done; rest designed |
| P4 Hardening (security, load, cost) | ⬜ | designed in report only |

## Data & features

- [x] Real dataset (5-class, 662 clips) in `data/archive/`
- [x] Keypoint normalization (translation/scale invariant) — tested
- [x] Kinematic features (velocity, bone angles, validity)
- [x] Confidence masking + temporal interpolation
- [x] Whole-clip temporal sampling (`read_video_uniform`)
- [x] Graph layout for ST-GCN (joint-grouped channels)
- [x] Augmentation (mirror, jitter, dropout, noise)
- [x] Leakage-safe splits (video/player-disjoint) — tested
- [ ] DVC data versioning for `data/kp` + manifest
- [ ] Player labels (enable player-disjoint eval)
- [ ] Larger corpus (≥5k clips) — biggest accuracy lever

## Modeling, training & evaluation

- [x] BiLSTM + attention (deployed)
- [x] ST-GCN graph model (built + unit-tested)
- [x] Model factory (swap via `model.name`)
- [x] Training loop (seeded, class-weighted, early stopping)
- [x] Calibration (temperature scaling) + abstention
- [x] Metrics (per-class F1, confusion, ECE)
- [x] k-fold CV runner (group-stratified)
- [x] ST-GCN benchmarked on real data (5-fold CV = 0.502 ± 0.059; loses to BiLSTM)
- [x] Whole-clip BiLSTM 5-fold CV = 0.590 ± 0.053 (best model; +13.4 pts over 16-frame)
- [x] Transfer-learning scaffold (backbone transfer + head reinit + freeze, joint adapter)
- [ ] Acquire external data (VideoBadminton / ShuttleSet) — biggest lever, see Next steps
- [ ] Run pretrain → fine-tune on real external data (scaffold ready)
- [ ] Hyperparameter search (seq len, hidden size, LR)
- [ ] Hierarchical classifier (FH/BH → shot) for drive↔clear confusion
- [ ] Reduce fold variance / ECE (whole-clip std rose to 0.059)

## Inference & serving

- [x] Pluggable `PoseEstimator` interface
- [x] RTMPose backend (rtmlib/ONNX) — verified on real video
- [x] Video decoders (`read_video`, `read_video_uniform`)
- [x] `ActionPredictor` (calibrated, abstains) — end-to-end verified
- [x] FastAPI keypoint endpoint (`/v1/predict/keypoints`)
- [ ] Video-upload → async job endpoint (queue + worker)
- [ ] ONNX export of action model
- [ ] GPU batching / model server (Triton/TorchServe)
- [ ] Multi-person tracking for doubles (only motion-energy heuristic now)

## MLOps, infra & quality

- [x] Experiment tracking (MLflow)
- [x] Self-contained checkpoint (weights + config + temperature)
- [x] Unit/integration tests (20)
- [x] Lint (ruff) clean
- [x] Docker + CI (GitHub Actions)
- [x] GPU paths (Colab CUDA notebook, Apple MPS)
- [ ] Enforce type checking (mypy currently advisory)
- [ ] Model registry + promotion gate
- [ ] Drift monitoring (Evidently) + Prometheus/Grafana
- [ ] Automated retraining triggers
- [ ] Security (authN/Z, rate limit, file/AV scan, secrets)
- [ ] Load test + cost validation

## Documentation

- [x] README (workflow, models, GPU)
- [x] Professional report (HTML + PDF)
- [x] Colab GPU notebook
- [x] This tracker
- [x] Project memory

## Results log

| Date | Model | Config | Eval | Accuracy | Macro-F1 | ECE |
|---|---|---|---|---|---|---|
| (paper) | 5-layer LSTM | 4-class, frame split | test | 0.80 | — | — |
| 2026-06-23 | BiLSTM | 16-frame (first ~1.6s) | 5-fold CV | 0.456 ± 0.035 | 0.443 | 0.064 |
| 2026-06-23 | BiLSTM | 16-frame | held-out test | 0.535 | 0.507 | 0.080 |
| 2026-06-24 | **BiLSTM** | 24-frame whole-clip | **5-fold CV** | **0.590 ± 0.053** | **0.575 ± 0.060** | 0.086 ± 0.016 |
| 2026-06-24 | BiLSTM | 24-frame whole-clip (deployed) | held-out test | 0.566 | 0.548 | 0.108 |
| 2026-06-24 | ST-GCN | 24-frame whole-clip | 5-fold CV | 0.502 ± 0.059 | 0.491 ± 0.052 | 0.077 ± 0.023 |

Chance = 0.20 (5 classes). **Best model: BiLSTM whole-clip, 0.590 ± 0.053.** Two firm results:
(1) whole-clip coverage vs 16-frame = **+13.4 pts** (0.456 → 0.590) CV-to-CV — the swing matters;
(2) BiLSTM **beats** ST-GCN (0.590 vs 0.502) — the graph model is data-starved on ~460 clips.

## Next steps (priority order)

Data is the proven bottleneck (BiLSTM ≈ ST-GCN ≈ 0.50–0.57). External badminton datasets
are 10–55× our size — see [datasets below].

1. [ ] **Acquire external data** — email VideoBadminton authors (7,822 clips, 18 classes);
       and/or use BST repo's ready-made ShuttleSet skeleton `.npy` (Google Drive)
2. [ ] **Run pretrain → fine-tune** on that data (scaffold built: `convert_external.py`,
       `configs/finetune.yaml`, `train.init_from`)
3. [ ] Benchmark BiLSTM whole-clip 5-fold CV (close the comparison gap)
4. [ ] Async video endpoint + ONNX serving — once accuracy clears a usable bar
5. [ ] DVC + model registry + monitoring — close the MLOps loop

## External datasets (data-acquisition targets)

| Dataset | Size | Classes | Access | Use |
|---|---|---|---|---|
| VideoBadminton | 7,822 clips | 18 | email authors | direct expansion (clips → our pipeline) |
| ShuttleSet | 36,492 strokes | 18 | annotations public; BWF videos | large; needs segmentation |
| BST repo skeletons | ShuttleSet/BadmintonDB | 35/25/18 | Google Drive (.npy) | pretraining (joint adapter ready) |
| NTU RGB+D | 114k clips | 120 generic | public | generic ST-GCN pretraining |
