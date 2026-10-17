.PHONY: help install dev backend frontend frontend-mock test test-backend test-frontend evaluate contracts seed clean

help:
	@echo "======================================================================"
	@echo "SupplySense Unified Monorepo Development Commands"
	@echo "======================================================================"
	@echo "  make install        - Install both backend and frontend dependencies"
	@echo "  make dev            - Run backend (:8000) and frontend (:3000) together"
	@echo "  make backend        - Run FastAPI backend server (http://localhost:8000)"
	@echo "  make frontend       - Run Next.js frontend with live backend"
	@echo "  make frontend-mock  - Run Next.js frontend with mock fixtures"
	@echo "  make test           - Run full test suite (backend pytest + frontend typecheck)"
	@echo "  make test-backend   - Run backend test suite (pytest)"
	@echo "  make test-frontend  - Run frontend TypeScript check and linter"
	@echo "  make evaluate       - Run benchmark evaluation suite (precision/recall/latency)"
	@echo "  make contracts      - Export OpenAPI schema and JSON fixtures"
	@echo "  make seed           - Reset and seed SQLite DB with baseline seed 42"
	@echo "  make clean          - Remove caches and build artifacts"

install:
	pip install -r backend/requirements.txt
	cd frontend && npm install

backend:
	uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev

frontend-mock:
	cd frontend && npm run dev:mock

dev:
	python scripts/run_dev.py

test-backend:
	python -m pytest -v backend/tests

test-frontend:
	cd frontend && npm run check-types

test: test-backend test-frontend

evaluate:
	python scripts/evaluate.py

contracts:
	python scripts/export_contracts.py

seed:
	python scripts/seed.py --reset

clean:
	python -c "import shutil, os, glob; [shutil.rmtree(p, ignore_errors=True) for p in glob.glob('**/__pycache__', recursive=True) + ['.pytest_cache', 'frontend/.next']]"
