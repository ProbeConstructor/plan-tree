#!/usr/bin/env bash
# Ya no necesita WEBKIT_DISABLE_DMABUF_RENDERER — lo setea el binario.
DIR="$(dirname "$(readlink -f "$0")")"

if [ -f "$DIR/plan-tree_0.1.0_amd64.AppImage" ]; then
  APPIMAGE="$DIR/plan-tree_0.1.0_amd64.AppImage"
elif [ -f "$DIR/Plan Tree-0.1.0.AppImage" ]; then
  APPIMAGE="$DIR/Plan Tree-0.1.0.AppImage"
else
  echo "No se encuentra el AppImage. Copiá este script al mismo directorio que el AppImage." >&2
  exit 1
fi

chmod +x "$APPIMAGE" 2>/dev/null
exec "$APPIMAGE" "$@"
