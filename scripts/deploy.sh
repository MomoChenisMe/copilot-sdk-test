#!/bin/bash
set -euo pipefail

# ============================================================
# AI Terminal — Deploy Script
# Usage: ./scripts/deploy.sh [user@host]
# ============================================================

REMOTE_HOST="${1:-${DEPLOY_HOST:-}}"
REMOTE_DIR="/opt/ai-terminal"
SERVICE_NAME="ai-terminal"

if [ -z "$REMOTE_HOST" ]; then
  echo "Usage: $0 <user@host>"
  echo "  or set DEPLOY_HOST environment variable"
  exit 1
fi

echo "==> Deploying AI Terminal to $REMOTE_HOST:$REMOTE_DIR"

# Step 1: Build locally
echo "==> Building frontend..."
npm run build --workspace=frontend

echo "==> Building backend..."
npm run build --workspace=backend

# Step 2: Sync files to remote
echo "==> Uploading files via rsync..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'data/' \
  --exclude '*.test.ts' \
  --exclude 'tests/' \
  ./ "$REMOTE_HOST:$REMOTE_DIR/"

# Step 3: Install dependencies on remote
echo "==> Installing production dependencies on remote..."
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && npm install --production"

# Step 4: Run backend build on remote (for native modules like node-pty, better-sqlite3)
echo "==> Building backend on remote..."
ssh "$REMOTE_HOST" "cd $REMOTE_DIR && npm run build --workspace=backend"

# Step 5: Copy systemd service file
echo "==> Installing systemd service..."
ssh "$REMOTE_HOST" "sudo cp $REMOTE_DIR/systemd/$SERVICE_NAME.service /etc/systemd/system/ && sudo systemctl daemon-reload"

# Step 6: Copy nginx config
echo "==> Installing nginx config..."
ssh "$REMOTE_HOST" "sudo cp $REMOTE_DIR/nginx/ai-terminal.conf /etc/nginx/sites-available/ && sudo ln -sf /etc/nginx/sites-available/ai-terminal.conf /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx"

# Step 7: Restart service
echo "==> Restarting service..."
ssh "$REMOTE_HOST" "sudo systemctl restart $SERVICE_NAME"

# Step 8: Check status
echo "==> Checking service status..."
ssh "$REMOTE_HOST" "sudo systemctl status $SERVICE_NAME --no-pager" || true

echo ""
echo "==> Deployment complete!"
echo "    Service: $SERVICE_NAME"
echo "    Remote:  $REMOTE_HOST:$REMOTE_DIR"
