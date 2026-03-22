#!/usr/bin/env bash
# ============================================================
#  One-time server setup for zstatement on Ubuntu
#  Run once on the server:  bash setup.sh
# ============================================================
set -euo pipefail

REMOTE=/home/ubuntu/zstatement
APP_USER=ubuntu

echo ""
echo "======================================"
echo "  zstatement server setup"
echo "======================================"

# ── Node.js 20 ────────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
    echo ""
    echo "[1/5] Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo ""
    echo "[1/5] Node.js already installed: $(node -v)"
fi

# ── PM2 ───────────────────────────────────────────────────────────────────────
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "[2/5] Installing PM2..."
    sudo npm install -g pm2
else
    echo ""
    echo "[2/5] PM2 already installed: $(pm2 -v)"
fi

echo "       Configuring PM2 to start on boot..."
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER | tail -1 | sudo bash || true

# ── Nginx ─────────────────────────────────────────────────────────────────────
if ! command -v nginx &> /dev/null; then
    echo ""
    echo "[3/5] Installing Nginx..."
    sudo apt-get install -y nginx
else
    echo ""
    echo "[3/5] Nginx already installed."
fi

# ── Nginx site config ─────────────────────────────────────────────────────────
echo ""
echo "[4/5] Configuring Nginx..."

sudo tee /etc/nginx/sites-available/zstatement > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name _;

    # Serve React SPA
    root /home/ubuntu/zstatement/client/dist;
    index index.html;

    # SPA fallback — let React Router handle client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy /api/* to Express (port 3001)
    location /api {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   Connection        "";
        # Allow large Excel file uploads
        client_max_body_size 50m;
    }
}
NGINX_CONF

# Enable site, remove default
sudo ln -sf /etc/nginx/sites-available/zstatement /etc/nginx/sites-enabled/zstatement
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx

# ── App directories ───────────────────────────────────────────────────────────
echo ""
echo "[5/5] Creating application directories..."
mkdir -p $REMOTE/server/prisma/migrations
mkdir -p $REMOTE/client/dist
mkdir -p $REMOTE/deploy

echo ""
echo "======================================"
echo "  Setup complete!"
echo ""
echo "  Next step: run deploy.ps1 from"
echo "  your Windows machine to push code."
echo "======================================"
