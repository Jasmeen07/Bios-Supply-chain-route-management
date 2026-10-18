@echo off
echo ============================================================
echo  SupplySense - One-Click Development Server
echo  Backend:  http://localhost:8000  (API + Docs: /docs)
echo  Frontend: http://localhost:3000
echo ============================================================
echo.

REM ---- Start Backend (FastAPI) in background ----
echo [1/2] Starting FastAPI backend on port 8000...
start /B cmd /c "cd /d %~dp0 && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

REM Give backend a moment to initialize
timeout /t 3 /nobreak >nul

REM ---- Start Frontend (Next.js) in foreground ----
echo [2/2] Starting Next.js frontend on port 3000...
echo.
echo Both servers running. Close this window to stop everything.
echo.
cd /d %~dp0\frontend
npm.cmd run dev
