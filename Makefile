# Makefile for awkwardgoat3 chat application

.PHONY: help install dev-backend dev-frontend dev stop clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install        - Install all dependencies (Go modules + Bun packages)"
	@echo "  make dev-backend    - Start Go backend server"
	@echo "  make dev-frontend   - Start Next.js frontend with Bun"
	@echo "  make dev            - Start both backend and frontend concurrently"
	@echo "  make stop           - Stop all running servers"
	@echo "  make clean          - Clean build artifacts and dependencies"

# Install dependencies
install:
	@echo "Installing Go dependencies..."
	cd backend && go mod download
	@echo "Installing frontend dependencies with Bun..."
	cd frontend && bun install
	@echo "Dependencies installed successfully!"

# Run backend server
dev-backend:
	@echo "Starting Go backend server on port 8080..."
	cd backend && go run main.go

# Run frontend server
dev-frontend:
	@echo "Starting Next.js frontend with Bun on port 3000..."
	cd frontend && bun dev

# Run both servers (requires PowerShell on Windows)
dev:
	@echo "Starting both backend and frontend servers..."
	@powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd backend; go run main.go'"
	@powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd frontend; bun dev'"
	@echo "Servers started in separate windows!"

# Stop servers (kills processes on ports 8080 and 3000)
stop:
	@echo "Stopping servers..."
	@powershell -Command "Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }"
	@powershell -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $$_.OwningProcess -Force -ErrorAction SilentlyContinue }"
	@echo "Servers stopped!"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@if exist "frontend\.next" rmdir /s /q "frontend\.next"
	@if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
	@echo "Clean complete!"
