#!/bin/bash
# =============================================================================
# Leasefy AI Agents — Setup Script
# Run: bash scripts/setup-agents.sh
# =============================================================================

set -e

echo "🤖 Leasefy AI Agents Setup"
echo "=========================="
echo ""

# --- Check .env.local ---
if [ ! -f .env.local ]; then
  echo "📄 Creating .env.local from template..."
  cat > .env.local << 'EOF'
# =============================================================================
# Database (Neon PostgreSQL)
# =============================================================================
DATABASE_URL="postgresql://user:password@host.neon.tech/arriendo_facil?sslmode=require"

# =============================================================================
# AI Agents (Anthropic)
# =============================================================================
ANTHROPIC_API_KEY=""

# =============================================================================
# Authentication (Supabase)
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

# =============================================================================
# Notifications (Twilio WhatsApp) — Optional
# =============================================================================
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_FROM="whatsapp:+1..."

# =============================================================================
# Background Jobs (Inngest) — Optional
# =============================================================================
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""
EOF
  echo "   ✅ .env.local created — fill in your keys!"
else
  echo "   ✅ .env.local already exists"
fi

# --- Check required env vars ---
echo ""
echo "🔑 Checking environment variables..."

source .env.local 2>/dev/null || true

if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = 'postgresql://user:password@host.neon.tech/arriendo_facil?sslmode=require' ]; then
  echo "   ⚠️  DATABASE_URL not configured — Prisma will use stub mode"
  echo "   → Get a Neon DB at https://neon.tech"
  DB_READY=false
else
  echo "   ✅ DATABASE_URL configured"
  DB_READY=true
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "   ⚠️  ANTHROPIC_API_KEY not configured — OCR and explanations won't work"
  echo "   → Get a key at https://console.anthropic.com"
else
  echo "   ✅ ANTHROPIC_API_KEY configured"
fi

if [ -z "$TWILIO_ACCOUNT_SID" ]; then
  echo "   ℹ️  TWILIO not configured — notifications will use dry_run mode (logged only)"
else
  echo "   ✅ TWILIO configured"
fi

# --- Install dependencies ---
echo ""
echo "📦 Installing dependencies..."
npm install

# --- Generate Prisma client ---
if [ "$DB_READY" = true ]; then
  echo ""
  echo "🗄️  Generating Prisma client..."
  npx prisma generate

  echo ""
  echo "🗄️  Pushing schema to database..."
  npx prisma db push

  echo "   ✅ Database ready"
else
  echo ""
  echo "⏭️  Skipping Prisma generate (no DATABASE_URL)"
  echo "   The app will run in stub mode — scoring algorithm works, but no DB persistence"
fi

# --- Summary ---
echo ""
echo "=========================="
echo "✅ Setup complete!"
echo ""
echo "What works now:"
echo "  • Scoring algorithm (calculate-score) — fully functional"
echo "  • Compatibility matching (calculate-compatibility) — fully functional"
echo "  • Cross-document consistency checks — fully functional"
echo "  • Fraud detection heuristics — fully functional"
echo ""

if [ "$DB_READY" = true ]; then
  echo "  • Database queries — connected to Neon"
  echo "  • Result storage — RiskScoreResult table"
else
  echo "  • Database queries — stub mode (no persistence)"
fi

echo ""
echo "To start: npm run dev"
echo "API endpoint: POST http://localhost:3001/api/agents/tenant-scoring"
echo "  Body: { \"applicationId\": \"xxx\", \"agencyId\": \"xxx\" }"
echo ""
