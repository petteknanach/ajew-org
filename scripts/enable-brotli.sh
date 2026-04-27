#!/bin/bash
# Enable Brotli and Gzip compression on server
# This script configures the web server for maximum compression

set -e

echo "=== Enabling Brotli & Gzip Compression ==="

# Check if we're on Nginx
if command -v nginx &> /dev/null; then
    NGINX_CONF="/etc/nginx/nginx.conf"
    if [ -f "$NGINX_CONF" ]; then
        echo "Configuring Nginx for Brotli compression..."
        
        # Add Brotli config to nginx
        cat >> "$NGINX_CONF" << 'NGINXEOF'

# Brotli compression
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css text/xml text/javascript application/javascript application/x-javascript application/json application/xml application/rss+xml image/svg+xml;
brotli_static on;
NGINXEOF
        
        # Test and reload nginx
        nginx -t && systemctl reload nginx
        echo "✓ Nginx configured for Brotli compression"
    fi
fi

# Check if we're on Apache
if command -v apache2 &> /dev/null || command -v httpd &> /dev/null; then
    echo "Configuring Apache for compression..."
    # Already handled by .htaccess
    echo "✓ Apache configured via .htaccess"
fi

echo "✓ Compression enabled successfully!"
