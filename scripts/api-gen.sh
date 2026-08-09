#!/usr/bin/env bash
set -euo pipefail

# Leasefy Agent API — OpenAPI codegen script
# Hybrid strategy: try live agent dev server first, fall back to committed snapshot.
#
# Usage: bash scripts/api-gen.sh   (or via: pnpm api:gen)
# Output: src/lib/api/generated/agent.ts
#
# ⚠️ El servidor vivo NO siempre es el contrato completo.
#
# En el agente hay rutas registradas SÓLO para documentación: viven en
# `src/server/routes/manifest-docs-only.ts`, que importa `scripts/dump-openapi.ts`
# y NUNCA el servidor. Con el agente corriendo, `/openapi.json` devuelve 181
# rutas; el spec canónico (`pnpm openapi:dump` en el agente) tiene 198 — las 17
# que faltan son ARCO y cotizador-admin.
#
# Sin el guardarraíl de abajo, correr esto contra un agente local borraba esas
# 17 rutas y sus 36 esquemas del contrato del front, en silencio y con el CI en
# verde. Si el guardarraíl salta, el spec bueno se saca así:
#
#   cd ../agent && pnpm openapi:dump && cp openapi-snapshot.json ../mvp/scripts/
#   cd ../mvp && node_modules/.bin/openapi-typescript scripts/openapi-snapshot.json \
#     -o src/lib/api/generated/agent.ts

AGENT_URL="http://localhost:4000/openapi.json"
SNAPSHOT="scripts/openapi-snapshot.json"
OUTPUT="src/lib/api/generated/agent.ts"
TMPFILE=$(mktemp /tmp/openapi-snapshot-XXXXXX.json)

# Ensure the generated/ directory exists
mkdir -p src/lib/api/generated

SOURCE="live"

# Step 1: Try the live agent dev server
if curl --max-time 5 --silent --fail "$AGENT_URL" -o "$TMPFILE" 2>/dev/null; then
  # Validate that the response is valid JSON before overwriting the snapshot.
  # Read via stdin (fd 0) so Windows-native node never has to resolve the POSIX
  # /tmp path that Git Bash's mktemp produces (bash opens the file, not node).
  if node -e "JSON.parse(require('fs').readFileSync(0, 'utf8'))" < "$TMPFILE" 2>/dev/null; then
    # Guardarraíl: un contrato nuevo puede AGREGAR rutas, nunca perderlas de a
    # montones. Si el vivo trae menos que el snapshot commiteado, casi siempre
    # es que el servidor no registra las docs-only — no que se hayan borrado.
    if [ -f "$SNAPSHOT" ]; then
      PERDIDAS=$(node -e '
        const fs = require("fs");
        const antes = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const ahora = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
        const faltan = Object.keys(antes.paths ?? {}).filter((p) => !(p in (ahora.paths ?? {})));
        process.stdout.write(faltan.join("\n"));
      ' "$SNAPSHOT" "$TMPFILE")
      if [ -n "$PERDIDAS" ]; then
        echo "ERROR: el agente vivo sirve $(printf '%s\n' "$PERDIDAS" | wc -l | tr -d ' ') rutas MENOS que el contrato commiteado:" >&2
        printf '%s\n' "$PERDIDAS" | sed 's/^/  - /' >&2
        echo "" >&2
        echo "Regenerar desde acá las borraría del front sin avisar. Ver la nota" >&2
        echo "al principio de este script: el spec canónico sale de 'pnpm openapi:dump'" >&2
        echo "en el agente, no de su servidor." >&2
        rm -f "$TMPFILE"
        exit 1
      fi
    fi
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
