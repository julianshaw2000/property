#!/bin/bash

# ======================
# MaintainUK Local Setup Script (Linux/Mac)
# ======================

set -e

echo "🚀 MaintainUK Local Setup"
echo "=========================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v dotnet >/dev/null 2>&1 || { echo "❌ .NET SDK not found. Install from https://dotnet.microsoft.com"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Install from https://docker.com"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required (found v$NODE_VERSION)"
  exit 1
fi

DOTNET_VERSION=$(dotnet --version | cut -d'.' -f1)
if [ "$DOTNET_VERSION" -lt 8 ]; then
  echo "❌ .NET 8+ required (found $DOTNET_VERSION)"
  exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ .NET $(dotnet --version)"
echo "✅ Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1)"
echo ""

# Setup environment
if [ ! -f .env ]; then
  echo "📝 Creating .env from template..."
  cp .env.example .env
  echo "✅ .env created. Edit with your configuration."
  echo ""
else
  echo "⚠️  .env already exists, skipping..."
  echo ""
fi

# Start infrastructure
echo "🐳 Starting infrastructure (Postgres, Redis, MinIO)..."
docker-compose up -d

echo "⏳ Waiting for Postgres to be ready..."
until docker exec maintainuk-postgres pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done

echo "⏳ Waiting for Redis to be ready..."
until docker exec maintainuk-redis redis-cli ping >/dev/null 2>&1; do
  sleep 1
done

echo "✅ Infrastructure ready"
echo ""

# Setup .NET API
echo "🔧 Setting up .NET API..."
cd apps/api
dotnet restore
dotnet tool install --global dotnet-ef --version 8.* || true
dotnet ef database update
cd ../..
echo "✅ .NET API ready"
echo ""

# Setup Angular
echo "🔧 Setting up Angular..."
cd apps/web
npm install
cd ../..
echo "✅ Angular ready"
echo ""

# Setup Node jobs service
echo "🔧 Setting up Node jobs service..."
cd apps/jobs
npm install
cd ../..
echo "✅ Node jobs service ready"
echo ""

# Seed database
echo "🌱 Seeding database with demo data..."
cd apps/api
dotnet run --seed
cd ../..
echo "✅ Database seeded"
echo ""

echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "  Terminal 1: cd apps/api && dotnet run"
echo "  Terminal 2: cd apps/web && npm start"
echo "  Terminal 3: cd apps/jobs && npm run dev"
echo ""
echo "Then visit:"
echo "  Web App: http://localhost:4200"
echo "  API: http://localhost:5000"
echo "  Swagger: http://localhost:5000/swagger"
echo ""
echo "Default credentials: admin@demo.maintainuk.com / Demo123!"
echo ""

