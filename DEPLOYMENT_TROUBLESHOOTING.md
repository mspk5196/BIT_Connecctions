# Deployment Troubleshooting Guide

## 502 Bad Gateway Error for OCR Service

### Problem

The OCR text extraction endpoint (`/api-ai/extract-card`) returns a 502 Bad Gateway error after deployment.

### Root Causes

1. **OCR service not running** - The `bitconnections-ocr` container may have crashed or failed to start
2. **Reverse proxy misconfiguration** - Nginx/Apache not properly routing to the OCR service
3. **Port mismatch** - Service listening on wrong port
4. **Missing environment variables** - API_KEY or other required env vars not set

---

## Diagnostic Steps

### 1. Check if OCR container is running

```bash
docker ps | grep bitconnections-ocr
```

Expected output: Container should be "Up" and healthy

### 2. Check OCR container logs

```bash
docker logs bitconnections-ocr
```

Look for:

- ✅ "PaddleOCR engine ready"
- ✅ "Gemini AI configured"
- ✅ "Starting OCR Flask Server on port 6000..."
- ❌ Any error messages or crashes

### 3. Test OCR service health check (from inside the server)

```bash
# From server terminal
curl http://localhost:6001/health

# Or from inside the container network
docker exec bitconnections-ocr curl http://localhost:6000/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "OCR API",
  "port": "6000",
  "ocr_ready": true
}
```

### 4. Check reverse proxy configuration

The reverse proxy must route `/bitconnections/api-ai/*` to `http://bitconnections-ocr:6000/*`

**For Nginx**, check `/etc/nginx/sites-available/your-site`:

```nginx
location /bitconnections/api-ai/ {
    proxy_pass http://bitconnections-ocr:6000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Increase timeouts for OCR processing
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

**For Apache**, check your VirtualHost configuration:

```apache
ProxyPass /bitconnections/api-ai/ http://bitconnections-ocr:6000/
ProxyPassReverse /bitconnections/api-ai/ http://bitconnections-ocr:6000/
```

### 5. Verify environment variables

Check if `/envs/bit-connections-ai.env` exists and contains:

```bash
API_KEY=your_gemini_api_key_here
PORT=6000
```

### 6. Check Docker network connectivity

```bash
# Verify all containers are on the same network
docker network inspect reverse-proxy

# Test connectivity from backend to OCR service
docker exec bitconnections-backend curl http://bitconnections-ocr:6000/health
```

---

## Common Fixes

### Fix 1: Restart the OCR service

```bash
docker-compose restart ocr_service
```

### Fix 2: Rebuild and redeploy

```bash
cd /path/to/BIT_Connecctions
docker-compose down
docker-compose build --no-cache ocr_service
docker-compose up -d
```

### Fix 3: Check and reload reverse proxy

```bash
# For Nginx
sudo nginx -t  # Test configuration
sudo systemctl reload nginx

# For Apache
sudo apachectl configtest
sudo systemctl reload apache2
```

### Fix 4: Add missing environment variables

```bash
# Edit the env file
sudo nano /envs/bit-connections-ai.env

# Add API_KEY if missing
API_KEY=your_actual_gemini_api_key

# Restart the service
docker-compose restart ocr_service
```

### Fix 5: Increase proxy timeouts

OCR processing can take time, especially for large images. Add these to your Nginx config:

```nginx
proxy_connect_timeout 120s;
proxy_send_timeout 120s;
proxy_read_timeout 120s;
client_max_body_size 10M;  # Allow larger image uploads
```

---

## Expected Service Architecture

```
User Browser
    ↓ HTTPS
Reverse Proxy (Nginx/Apache) at pcdp.bitsathy.ac.in
    ↓
/bitconnections/api-ai/* → bitconnections-ocr:6000 (Python Flask)
/bitconnections/api/* → bitconnections-backend:5000 (Node.js)
/bitconnections/* → bitconnections-frontend:80 (React/Nginx)
```

---

## Verification Test

After applying fixes, test the endpoint:

```bash
# Create a test image request
curl -X POST \
  https://pcdp.bitsathy.ac.in/bitconnections/api-ai/health \
  -H "Content-Type: application/json"

# Test with actual image (from server)
curl -X POST \
  http://localhost:6001/extract-card \
  -F "file=@/path/to/test-card.jpg"
```

---

## Additional Notes

- The OCR service uses PaddleOCR (requires significant CPU/RAM)
- First request may be slow due to model initialization
- Ensure the server has at least 2GB RAM available for the OCR container
- Check `docker stats bitconnections-ocr` to monitor resource usage
