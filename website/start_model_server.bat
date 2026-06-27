@echo off
setlocal

:: Launch the Python FastAPI model server for badminton action classification.
:: Run this BEFORE (or alongside) `npm run dev` on Windows.
::
:: Usage:
::   start_model_server.bat
::   set PORT=8080 && start_model_server.bat

:: ---- paths ------------------------------------------------------------------
set SCRIPT_DIR=%~dp0
set ML_PROJECT=%SCRIPT_DIR%..\model
set VENV=%ML_PROJECT%\.venv\Scripts
set MODEL=%ML_PROJECT%\model.pt

if not exist "%MODEL%" (
  echo [ERROR] model.pt not found at %MODEL%
  exit /b 1
)

:: ---- env --------------------------------------------------------------------
set MODEL_PATH=%MODEL%

if defined PYTHONPATH (
  set "PYTHONPATH=%ML_PROJECT%\src;%PYTHONPATH%"
) else (
  set "PYTHONPATH=%ML_PROJECT%\src"
)

if not defined POSE_DEVICE set POSE_DEVICE=cpu
if not defined POSE_MODE set POSE_MODE=balanced
if not defined PORT set PORT=8000

echo Starting model server on http://127.0.0.1:%PORT%
echo MODEL_PATH  = %MODEL_PATH%
echo POSE_DEVICE = %POSE_DEVICE%
echo POSE_MODE   = %POSE_MODE%
echo.

"%VENV%\uvicorn.exe" badminton.serving.app:app --host 127.0.0.1 --port %PORT% --log-level info
