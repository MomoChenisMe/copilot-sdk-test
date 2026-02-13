#!/bin/bash
set -euo pipefail

# ============================================================
# AI Terminal — Let's Encrypt SSL Setup
# Usage: ./scripts/setup-ssl.sh <domain> [email]
# Run this on the VPS after nginx is installed and configured
# ============================================================

DOMAIN="${1:-${SSL_DOMAIN:-}}"
EMAIL="${2:-${SSL_EMAIL:-}}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain> [email]"
  echo "  or set SSL_DOMAIN and SSL_EMAIL environment variables"
  exit 1
fi

echo "==> Setting up Let's Encrypt SSL for $DOMAIN"

# Step 1: Install certbot and nginx plugin
echo "==> Installing certbot..."
if command -v apt-get &> /dev/null; then
  sudo apt-get update
  sudo apt-get install -y certbot python3-certbot-nginx
elif command -v dnf &> /dev/null; then
  sudo dnf install -y certbot python3-certbot-nginx
else
  echo "ERROR: Unsupported package manager. Install certbot manually."
  exit 1
fi

# Step 2: Obtain SSL certificate
echo "==> Obtaining SSL certificate..."
if [ -n "$EMAIL" ]; then
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL"
else
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email
fi

# Step 3: Verify certificate
echo "==> Verifying certificate..."
sudo certbot certificates --domain "$DOMAIN"

# Step 4: Test auto-renewal
echo "==> Testing auto-renewal..."
sudo certbot renew --dry-run

# Step 5: Ensure renewal timer is active
echo "==> Checking renewal timer..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer --no-pager || true

echo ""
echo "==> SSL setup complete!"
echo "    Domain:   $DOMAIN"
echo "    Cert:     /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "    Key:      /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "    Renewal:  Automatic via certbot.timer"
