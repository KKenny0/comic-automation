#!/usr/bin/env bash
set -euo pipefail

CERT_DIR="$HOME/.certs"
BUNDLE="$CERT_DIR/convex-ca-bundle.pem"

mkdir -p "$CERT_DIR"

ensure_cert() {
  local url="$1"
  local out="$2"
  if [[ ! -s "$out" ]]; then
    curl -fsSL "$url" -o "$out"
  fi
}

ensure_cert "https://www.amazontrust.com/repository/AmazonRootCA1.pem" "$CERT_DIR/AmazonRootCA1.pem"
ensure_cert "https://www.amazontrust.com/repository/AmazonRootCA2.pem" "$CERT_DIR/AmazonRootCA2.pem"
ensure_cert "https://www.amazontrust.com/repository/AmazonRootCA3.pem" "$CERT_DIR/AmazonRootCA3.pem"
ensure_cert "https://www.amazontrust.com/repository/AmazonRootCA4.pem" "$CERT_DIR/AmazonRootCA4.pem"
ensure_cert "https://letsencrypt.org/certs/isrgrootx1.pem" "$CERT_DIR/ISRGRootX1.pem"

if [[ ! -s "$CERT_DIR/ISRGRootX2.pem" ]]; then
  curl -fsSL "https://letsencrypt.org/certs/isrg-root-x2.pem" -o "$CERT_DIR/ISRGRootX2.pem" \
    || curl -fsSL "https://letsencrypt.org/certs/isrgrootx2.pem" -o "$CERT_DIR/ISRGRootX2.pem"
fi

ensure_cert "https://pki.goog/roots.pem" "$CERT_DIR/google-roots.pem"

cat "$CERT_DIR"/AmazonRootCA*.pem "$CERT_DIR"/ISRGRootX*.pem "$CERT_DIR/google-roots.pem" > "$BUNDLE"

unset NODE_TLS_REJECT_UNAUTHORIZED
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy

export NODE_EXTRA_CA_CERTS="$BUNDLE"

node -e "require('https').get('https://api.convex.dev',r=>{console.log('[tls] api.convex.dev',r.statusCode);r.resume();}).on('error',e=>{console.error('[tls] api.convex.dev ERROR:',e.message);process.exit(1);})"
node -e "require('https').get('https://auth.convex.dev',r=>{console.log('[tls] auth.convex.dev',r.statusCode);r.resume();}).on('error',e=>{console.error('[tls] auth.convex.dev ERROR:',e.message);process.exit(1);})"
node -e "require('https').get('https://version.convex.dev',r=>{console.log('[tls] version.convex.dev',r.statusCode);r.resume();}).on('error',e=>{console.error('[tls] version.convex.dev ERROR:',e.message);process.exit(1);})"

export CONVEX_URL="${CONVEX_URL:-${NEXT_PUBLIC_CONVEX_URL:-}}"

exec npx convex dev "$@"
