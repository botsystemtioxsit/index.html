#!/usr/bin/env bash
# Ставит ярлык "Тролль-Баттл" в меню приложений Linux — обычный XDG
# .desktop-файл, тот же механизм, что и у любого другого установленного
# приложения. В ChromeOS (Crostini) это автоматически появляется в общем
# лаунчере среди Linux-приложений (сервис garcon следит за
# ~/.local/share/applications) — на обычном Debian/Ubuntu с рабочим столом
# (GNOME/KDE и т.п.) работает тем же способом. Запускать один раз; сам
# ярлык дальше просто вызывает troll-battle-gui.sh рядом с этим скриптом.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ICON_DIR="$HOME/.local/share/icons"
APPS_DIR="$HOME/.local/share/applications"
mkdir -p "$ICON_DIR" "$APPS_DIR"
cp "$DIR/icon.png" "$ICON_DIR/troll-battle.png"

cat > "$APPS_DIR/troll-battle.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Тролль-Баттл
Comment=Голосовой баттл в Telegram
Exec=$DIR/troll-battle-gui.sh
Icon=$ICON_DIR/troll-battle.png
Terminal=false
Categories=Game;
EOF
chmod +x "$APPS_DIR/troll-battle.desktop"

command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$APPS_DIR" >/dev/null 2>&1 || true

echo "Готово. Иконка «Тролль-Баттл» должна появиться в меню приложений"
echo "(в ChromeOS — в общем лаунчере среди Linux-приложений; если не видно"
echo "сразу, откройте лаунчер заново или подождите пару секунд)."
