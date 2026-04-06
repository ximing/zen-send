#!/bin/bash
set -euo pipefail

# ============================================================================
# Logo 同步脚本
# ============================================================================
#
# 功能：统一管理所有平台的 logo 和图标
# 
# 使用方式：
#   ./scripts/sync-logos.sh
#
# 说明：
#   - 从 assets/logo.png 和 assets/logo-dark.png 同步到各个平台
#   - logo.png: 浅色背景（用于暗色主题显示）
#   - logo-dark.png: 深色背景（用于浅色主题显示）
#
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# 检查源文件
if [ ! -f "assets/logo.png" ] || [ ! -f "assets/logo-dark.png" ]; then
  echo "❌ 错误：源文件不存在" >&2
  echo "   需要: assets/logo.png 和 assets/logo-dark.png" >&2
  exit 1
fi

# 检查 ImageMagick
if ! command -v magick >/dev/null 2>&1; then
  echo "❌ 错误：未找到 ImageMagick (magick)" >&2
  echo "   macOS: brew install imagemagick" >&2
  exit 1
fi

echo "======================================"
echo "📦 同步 Logo 到所有平台"
echo "======================================"

# ============================================================================
# Web 端 - 64x64 用于 sidebar
# ============================================================================
echo ""
echo "🌐 更新 Web 端..."
magick assets/logo.png -resize 64x64 -background none -gravity center -extent 64x64 apps/web/src/assets/logo.png
echo "✓ apps/web/src/assets/logo.png"

magick assets/logo-dark.png -resize 64x64 -background none -gravity center -extent 64x64 apps/web/src/assets/logo-dark.png
echo "✓ apps/web/src/assets/logo-dark.png"

# ============================================================================
# Mobile 端 - icon.png (192x192), adaptive-icon.png (108x108), splash.png (1024x1024)
# ============================================================================
echo ""
echo "📱 更新 Mobile 端..."
magick assets/logo.png -resize 192x192 -background none -gravity center -extent 192x192 apps/mobile/assets/icon.png
echo "✓ apps/mobile/assets/icon.png (192x192)"

magick assets/logo.png -resize 108x108 -background none -gravity center -extent 108x108 apps/mobile/assets/adaptive-icon.png
echo "✓ apps/mobile/assets/adaptive-icon.png (108x108)"

magick assets/logo.png -resize 512x512 -background white -gravity center -extent 1024x1024 apps/mobile/assets/splash.png
echo "✓ apps/mobile/assets/splash.png (1024x1024)"

# ============================================================================
# Electron 端
# ============================================================================
echo ""
echo "🖥️  更新 Electron 端..."

# 创建 build 目录
mkdir -p apps/electron/build

# icon.png - 512x512
magick assets/logo.png -resize 512x512 -background none -gravity center -extent 512x512 apps/electron/build/icon.png
echo "✓ apps/electron/build/icon.png (512x512)"

# icon_16.png - 16x16 用于 tray
magick assets/logo.png -resize 16x16 -background none -gravity center -extent 16x16 apps/electron/build/icon_16.png
echo "✓ apps/electron/build/icon_16.png (16x16)"

# icon.ico - Windows 图标
magick assets/logo.png -define icon:auto-resize=256,128,96,64,48,32,16 apps/electron/build/icon.ico
echo "✓ apps/electron/build/icon.ico (Windows)"

# icon.icns - macOS 图标
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

for size in 16 32 64 128 256 512 1024; do
  magick assets/logo.png -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} "${TMPDIR}/icon_${size}.png"
done

magick "${TMPDIR}/icon_1024.png" "${TMPDIR}/icon_512.png" "${TMPDIR}/icon_256.png" "${TMPDIR}/icon_128.png" "${TMPDIR}/icon_64.png" "${TMPDIR}/icon_32.png" "${TMPDIR}/icon_16.png" -define icon:auto-resize=1024,512,256,128,64,32,16 apps/electron/build/icon.icns
echo "✓ apps/electron/build/icon.icns (macOS)"

echo ""
echo "✅ Logo 同步完成！"
echo ""
echo "📝 更新说明："
echo "   - Web: logo.png (浅色) 和 logo-dark.png (深色)"
echo "   - Mobile: icon.png, adaptive-icon.png, splash.png"
echo "   - Electron: icon.png, icon_16.png, icon.ico, icon.icns"
echo ""
echo "💡 下次更新 logo 时，只需运行此脚本即可。"
