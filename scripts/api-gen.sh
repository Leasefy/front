#!/usr/bin/env bash
set -euo pipefail

# Leasefy Agent API — OpenAPI codegen script
# Hybrid strategy: try live agent dev server first, fall back to committed snapshot.
#
# Usage: bash scripts/api-gen.sh   (or via: pnpm api:gen)
# Output: src/lib/api/generated/agent.ts

AGENT_URL="http://localhost:4000/openapi.json"
SNAPSHOT="scripts/openapi-snapshot.json"
OUTPUT="src/lib/api/generated/agent.ts"
TMPFILE=$(mktemp /tmp/openapi-snapshot-XXXXXX.json)

# Ensure the generated/ directory exists
mkdir -p src/lib/api/generated

SOURCE="live"

# Step 1: Try the live agent dev server
if curl --max-time 5 --silent --fail "$AGENT_URL" -o "$TMPFILE" 2>/dev/null; then
  # Validate that the response is valid JSON before overwriting the snapshot
  if node -e "JSON.parse(require('fs').readFileSync('$TMPFILE', 'utf8'))" 2>/dev/null; then
    # Atomic snapshot update
    mv "$TMPFILE" "$SNAPSHOT"
    # Run codegen from live URL
    node_modules/.bin/openapi-typescript "$AGENT_URL" -o "$OUTPUT"
    SOURCE="live"
  else
    echo "WARNING: Agent returned invalid JSON — falling back to snapshot." >&2
    rm -f "$TMPFILE"
    SOURCE="snapshot"
  fi
else
  rm -f "$TMPFILE" 2>/dev/null || true
  SOURCE="snapshot"
fi

# Step 2: Fallback to snapshot if live server was unavailable
if [ "$SOURCE" = "snapshot" ]; then
  if [ ! -f "$SNAPSHOT" ]; then
    echo "ERROR: Agent server unreachable and no snapshot found." >&2
    echo "Run the agent dev server (pnpm dev in ~/rent/agent/) then retry." >&2
    exit 1
  fi
  node_modules/.bin/openapi-typescript "$SNAPSHOT" -o "$OUTPUT"
fi

echo "api:gen complete — agent.ts updated (source: ${SOURCE})"
