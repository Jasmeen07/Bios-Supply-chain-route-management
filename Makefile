.PHONY: help install frontend frontend-mock backend test-frontend test-backend contract-check

help:
	@echo "SupplySense Development Commands:"
	@echo "  make install        - Install frontend and backend dependencies"
	@echo "  make frontend       - Run Next.js frontend against live backend API"
	@echo "  make frontend-mock  - Run Next.js frontend with mock fixtures enabled"
	@echo "  make backend        - Run FastAPI backend development server"
	@echo "  make test-frontend  - Run frontend type check, linter, and tests"
	@echo "  make test-backend   - Run backend test suite (pytest)"
	@echo "  make contract-check - Verify fixtures against OpenAPI schema"

install:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

frontend-mock:
	cd frontend && npm run dev:mock

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

test-frontend:
	cd frontend && npm run test

test-backend:
	pytest backend/tests

contract-check:
	cd frontend && npm run check-types
