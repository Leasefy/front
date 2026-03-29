#!/bin/bash
# =============================================================================
# Leasefy AI Agents — Development Server
# Runs Next.js + Inngest Dev Server together
#
# Usage: bash scripts/dev-agents.sh
# Stop:  Ctrl+C (kills both servers)
# =============================================================================

set -e

cleanup() {
  echo ""
  echo "Stopping servers..."
  kill $NEXT_PID $INNGEST_PID 2>/dev/null
  exit 0
}

trap cleanup INT TERM

# Check Docker PostgreSQL
if ! docker ps --filter "name=leasefy-postgres" --format "{{.Names}}" | grep -q leasefy-postgres; then
  echo "Starting PostgreSQL..."
  docker start leasefy-postgres 2>/dev/null || \
    docker run -d --name leasefy-postgres \
      -e POSTGRES_USER=leasefy \
      -e POSTGRES_PASSWORD=leasefy_dev \
      -e POSTGRES_DB=leasefy_dev \
      -p 5433:5432 postgres:16-alpine
  sleep 3
fi

echo "PostgreSQL: localhost:5433"

# Start Next.js
echo "Starting Next.js on port 3001..."
npm run dev &
NEXT_PID=$!
sleep 5

# Start Inngest Dev Server
echo "Starting Inngest Dev Server on port 8288..."
npx inngest-cli@latest dev --no-discovery -u http://localhost:3001/api/inngest &
INNGEST_PID=$!
sleep 3

echo ""
echo "========================================"
echo "Leasefy AI Agents — Development Ready"
echo "========================================"
echo ""
echo "  Next.js:  http://localhost:3001"
echo "  Inngest:  http://localhost:8288"
echo "  Postgres: localhost:5433"
echo ""
echo "  Agent Hub:     http://localhost:3001/panel/inmobiliaria/ai"
echo "  Pricing:       http://localhost:3001/pricing"
echo "  Inngest UI:    http://localhost:8288"
echo ""
echo "  API Endpoints:"
echo "    POST /api/agents/tenant-scoring"
echo "    POST /api/agents/smart-matching"
echo "    GET  /api/agents/metrics"
echo "    GET  /api/agents/activity"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

wait
