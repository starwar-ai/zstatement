#!/usr/bin/env bash
# Remote deployment script — runs on the Ubuntu server after files are uploaded.
# Called automatically by deploy.ps1.
set -euo pipefail

REMOTE=/home/ubuntu/zstatement
SERVER_DIR="$REMOTE/server"

echo ""
echo "======================================"
echo "  zstatement remote deployment"
echo "======================================"

# ── 1. Install / update Node dependencies ─────────────────────────────────────
echo ""
echo "[1/5] Installing server dependencies..."
cd "$SERVER_DIR"
npm install --omit=dev

# ── 2. Regenerate Prisma client ───────────────────────────────────────────────
echo ""
echo "[2/5] Generating Prisma client..."
npx prisma generate

# ── 3. Apply pending database migrations ─────────────────────────────────────
echo ""
echo "[3/5] Running database migrations..."
npx prisma migrate deploy

# ── 4. Fix Nginx read permissions ────────────────────────────────────────────
echo ""
echo "[4/5] Fixing file permissions for Nginx..."
# Nginx (www-data) needs execute on every parent directory up to dist
chmod o+x /home/ubuntu
chmod -R o+rX "$REMOTE/client/dist"

# ── 5. Reload / start application via PM2 ────────────────────────────────────
echo ""
echo "[5/5] Reloading application..."
if pm2 describe zstatement > /dev/null 2>&1; then
    pm2 reload zstatement
else
    pm2 start ecosystem.config.cjs
    pm2 save
fi

echo ""
echo "======================================"
echo "  Remote deployment complete!"
echo "======================================"
