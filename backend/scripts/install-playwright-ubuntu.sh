#!/usr/bin/env bash
# Install Playwright Chromium + Ubuntu shared libraries (fixes libatk-1.0.so.0).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash scripts/install-playwright-ubuntu.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y

# Ubuntu 22.04 names, then 24.04 t64 names if the first set fails.
PACKAGES_22="libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libnss3 libnspr4 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxkbcommon0 libgtk-3-0 libx11-xcb1 libxcb1 libx11-6 libxext6 libdbus-1-3 fonts-liberation"
PACKAGES_24="libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libasound2t64 libatspi2.0-0t64 libgtk-3-0t64"

# shellcheck disable=SC2086
if ! apt-get install -y $PACKAGES_22; then
  apt-get install -y $PACKAGES_24 || true
  apt-get install -y libdrm2 libgbm1 libpango-1.0-0 libcairo2 libnss3 libnspr4 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxkbcommon0 libx11-xcb1 libxcb1 libx11-6 libxext6 libdbus-1-3 fonts-liberation || true
fi

if command -v npx >/dev/null 2>&1; then
  npx --yes playwright install-deps chromium || true
  sudo -u "${SUDO_USER:-ubuntu}" npx --yes playwright install chromium || npx --yes playwright install chromium
fi

echo "Playwright Linux dependencies installed."
echo "Restart the backend, then generate or retry template creation."
