# Тролль-Баттл — десктоп

Окно Electron, которое открывает живую игру (тот же адрес, что и в
браузере) — без вкладок, адресной строки и необходимости держать браузер
открытым. Это не отдельная копия игры: внутри крутится ровно та же
страница, что видят все остальные, так что любое обновление игры (push в
`src/index.html` → автосборка → GitHub Pages/Firebase Hosting) сразу
долетает и сюда, без переустановки приложения.

Вход внутри работает как обычно — гость, вход по email/Telegram ID или
токен доступа (см. `resolveIdentity()` в `src/index.html`), ничего
специального для десктоп-версии настраивать не нужно. Микрофон (игра —
голосовой баттл) разрешается через обычный системный диалог при первом
запросе.

## Запуск одной командой

```bash
cd desktop
./troll-battle-gui.sh
```

Скрипт сам ставит недостающие системные библиотеки Chromium (спросит
пароль sudo при первом запуске, если их нет), сам делает `npm install` при
первом запуске (~100+ МБ, качается один раз), и открывает окно. Повторные
запуски — сразу окно, без лишних вопросов.

Чтобы получить прямо одну команду `troll-battle-gui` из любой папки
терминала (не обязательно, но удобно):
```bash
mkdir -p ~/.local/bin
ln -sf "$(pwd)/troll-battle-gui.sh" ~/.local/bin/troll-battle-gui
```

## Иконка в меню приложений

```bash
cd desktop
./install-launcher.sh
```

Ставит ярлык «Тролль-Баттл» в `~/.local/share/applications` — в ChromeOS
(Crostini) он сам появляется в общем лаунчере среди Linux-приложений; на
Debian/Ubuntu с рабочим столом — в обычном меню приложений.

## Способы установки на Linux / ChromeOS (Crostini)

Готовые файлы всех трёх форматов ниже собираются автоматически в CI при
каждом изменении `desktop/` и публикуются одним и тем же релизом —
**[desktop-linux-latest](https://github.com/botsystemtioxsit/index.html/releases/tag/desktop-linux-latest)**
(ссылка не меняется между сборками, всегда актуальная версия). На части
свежих образов ChromeOS Crostini `.deb`-пакеты через `dpkg` ставить больше
нельзя — тогда используйте AppImage или `.tar.gz` ниже, оба не зависят от
пакетного менеджера контейнера вообще.

1. **`.tar.gz` — самый надёжный вариант, если остальное не заводится.**
   Не ставит ничего в систему, просто распаковывается в папку. На
   ChromeOS браузер скачивает файл в «Загрузки» самого ChromeOS — это
   НЕ то же самое, что `~/Downloads` внутри Linux (Crostini): откройте
   приложение «Файлы» → «Загрузки» → правый клик по файлу → **«Copy to
   Linux»**, только после этого он появится в домашней папке контейнера.
   ```bash
   tar -xzf troll-battle-desktop-*.tar.gz
   cd troll-battle-desktop-*/
   ./troll-battle-desktop
   ```
   Если при запуске пишет `error while loading shared libraries:
   libnss3.so...` — это отдельная нехватка системных библиотек
   Chromium (сам `.tar.gz` их с собой не носит), лечится один раз:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libnss3 libnspr4 libatk-bridge2.0-0 libatk1.0-0 libgtk-3-0 libgbm1 libasound2 libxss1 libxtst6 libdrm2 libxkbcommon0
   # если apt ругается на libasound2 (переименован на новых Debian/Ubuntu):
   sudo apt-get install -y libasound2t64
   ```
   Чтобы получить ярлык в меню приложений из этой же папки — тот же
   `install-launcher.sh`, что и ниже, только вместо `troll-battle-gui.sh`
   в нём нужно указать путь до `troll-battle-desktop` (одна строка
   `Exec=` в `~/.local/share/applications/troll-battle.desktop`).

2. **AppImage — тоже без установки, но нужен FUSE.**
   ```bash
   chmod +x "Тролль-Баттл-1.0.0.AppImage"
   ./"Тролль-Баттл-1.0.0.AppImage"
   ```
   Если ругается на отсутствие FUSE (частая ситуация в свежих Debian/
   Crostini, где `libfuse2` больше не ставится по умолчанию):
   ```bash
   sudo apt-get update
   sudo apt-get install -y libfuse2 || sudo apt-get install -y libfuse2t64
   ```

3. **`.deb` — обычная установка через пакетный менеджер, если он ещё
   поддерживается на вашем образе ChromeOS:**
   ```bash
   sudo dpkg -i troll-battle-desktop_1.0.0_amd64.deb
   ```

4. **Собрать/запустить из исходников — универсальный запасной вариант,
   если ни один из готовых файлов выше не подходит.** Требует `git` и
   `node`/`npm` (в Crostini обычно уже есть или ставится одной командой
   `sudo apt-get install -y git nodejs npm`):
   ```bash
   git clone https://github.com/botsystemtioxsit/index.html.git
   cd index.html/desktop
   ./troll-battle-gui.sh
   ```
   Именно так собран блок «Запуск одной командой» выше — `troll-battle-gui.sh`
   сам доставит недостающие системные библиотеки Chromium и Electron.

## Собрать установочный файл

Собирается через GitHub Actions (Windows/Linux CI-раннеры, ничего ставить
локально не нужно) — вкладка **Actions** → **Build Windows installer** /
**Build Linux installer** → **Run workflow**, либо автоматически при любом
пуше, который трогает `desktop/`. Готовые файлы публикуются как вложения
к GitHub Release этого репозитория под фиксированными тегами
`desktop-windows-latest` / `desktop-linux-latest` — ссылка не меняется
между сборками.

Собрать вручную то же самое можно и здесь:
```bash
npm install
npm run build:win     # .exe (нужен wine, см. .github/workflows/build-windows-installer.yml)
npm run build:linux   # AppImage + .deb + .tar.gz, нативно на Linux
```

## Свой значок приложения

Сейчас используется `desktop/icon.png` (пиксель-арт троллья морда).
Чтобы заменить — положите квадратный PNG минимум 512×512 поверх
`desktop/icon.png` под тем же именем, ничего больше менять не нужно.
