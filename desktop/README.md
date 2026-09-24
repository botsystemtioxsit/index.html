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

**Сама обёртка (иконка/разрешения/версия Electron — не содержимое игры,
то и так всегда живое) умеет обновляться сама**, через `electron-updater`:
Windows и Linux (AppImage) публикуются в один общий версионный релиз
GitHub (см. `build.publish` в `package.json` — тег `v<версия>`), и
собранное приложение при каждом запуске тихо проверяет `releases/latest`
и сама доставляет новую версию к следующему перезапуску, без похода за
файлом вручную. Реально работает только для Windows-инсталлятора и
Linux AppImage — `.deb`/`.tar.gz` как и раньше обновляются вручную,
перекачкой по той же ссылке.

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
каждом изменении `desktop/` и публикуются одним общим релизом вместе с
Windows-сборкой (нужно для автообновления, см. выше) —
**[releases/latest](https://github.com/botsystemtioxsit/index.html/releases/latest)**
(ссылка отдаётся самим GitHub и всегда указывает на актуальный релиз). На части
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

2. **AppImage — тоже без установки, но нужен FUSE. Единственный Linux-формат,
   который умеет обновляться сам** (см. автообновление выше).
   ```bash
   chmod +x *.AppImage
   ./*.AppImage
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
   sudo dpkg -i troll-battle-desktop_*_amd64.deb
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
пуше, который трогает `desktop/`. Оба таргета публикуются в один общий
версионный релиз этого репозитория (тег `v<версия>`, см.
`build.publish` в `package.json`) — это нужно, чтобы electron-updater
внутри приложения мог сам находить и ставить новую версию.
`https://github.com/botsystemtioxsit/index.html/releases/latest` всегда
указывает на этот релиз.

Собрать вручную то же самое можно и здесь:
```bash
npm install
npm run build:win     # .exe (нужен wine, см. .github/workflows/build-windows-installer.yml)
npm run build:linux   # AppImage + .deb + .tar.gz, нативно на Linux
```

## Свой значок приложения

Сейчас используется `desktop/icon.png` (звезда).
Чтобы заменить — положите квадратный PNG минимум 512×512 поверх
`desktop/icon.png` под тем же именем, ничего больше менять не нужно.
