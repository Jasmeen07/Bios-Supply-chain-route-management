@echo off
title SupplySense Platform [KEEP THIS WINDOW OPEN]
color 0A
cls
echo ====================================================================
echo                   SUPPLYSENSE RESILIENT LAUNCHER
echo ====================================================================
echo.
echo  Backend:  http://localhost:8000  (API + Swagger Docs)
echo  Frontend: http://localhost:3000  (Live Dashboard)
echo.
echo  [IMPORTANT] KEEP THIS WINDOW OPEN WHILE USING THE APPLICATION.
echo ====================================================================
echo.

REM ---- 1. Start Backend (FastAPI) in background ----
echo [1/3] Starting FastAPI backend on port 8000...
start "SupplySense-Backend" /B cmd /c "cd /d %~dp0 && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

REM ---- 2. Launch browser automatically after brief delay ----
echo [2/3] Scheduling browser auto-open in 6 seconds...
start /B cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"

REM ---- 3. Start Frontend (Next.js) in foreground ----
echo [3/3] Starting Next.js frontend on port 3000...
echo.
echo Starting dev server (takes ~10 seconds on first launch)...
echo Once started, your browser will open http://localhost:3000 automatically!
echo.
cd /d %~dp0\frontend
npm.cmd run dev
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend exited with code %ERRORLEVEL%.
    pause
)
