// Десктоп-обёртка над той же самой игрой — не отдельное приложение со своим
// UI, а окно Electron, которое открывает ЖИВУЮ страницу (тот же адрес, что
// и в обычном браузере). Так любое обновление игры (push в src/index.html
// -> автосборка -> GitHub Pages/Firebase Hosting) сразу долетает и сюда, без
// пересборки и переустановки десктоп-приложения — то же самое, что уже
// происходит в браузере у всех остальных.
const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

// URL, который видно в адресной строке браузера при открытии не из Telegram
// — тот же самый, просто в отдельном окне без вкладок/адресной строки. Вход
// внутри работает как обычно (гость/email-заявка/Telegram ID — см.
// resolveIdentity в src/index.html), никакой отдельной авторизации для
// самого приложения не требуется.
const GAME_URL = 'https://botsystemtioxsit.github.io/index.html/';

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 900,
    minWidth: 360,
    minHeight: 640,
    title: 'Тролль-Баттл',
    icon: path.join(__dirname, 'icon.png'), // значок окна/панели задач — тот же файл, что и у ярлыка меню приложений (см. install-launcher.sh) и у собранного AppImage/.deb (package.json → build.*.icon)
    autoHideMenuBar: true, // строка меню (File/Edit/...) игре не нужна — тут её просто прячем, а не убираем совсем, Alt всё ещё её покажет при необходимости
    backgroundColor: '#0B0B0D', // совпадает с тёмным фоном классической темы игры — без этого при загрузке на миг мелькает белый экран
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false, // страница игры не должна иметь доступ к Node.js API — это чужой веб-контент, пусть и наш собственный
    },
  });

  win.loadURL(GAME_URL);

  // Ссылки, которые сама игра захочет открыть в новой вкладке (например,
  // "Политика конфиденциальности" в Настройках), должны уходить в обычный
  // системный браузер, а не открывать второе окно Electron без адресной
  // строки — там их будет некуда закрыть иначе как Alt+F4.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Игра — голосовой баттл (LiveKit/WebRTC), значит getUserMedia() спросит
// доступ к микрофону. По умолчанию Electron такие запросы молча отклоняет —
// без этого обработчика микрофон не заработает вообще, даже если в системе
// разрешение выдано самому приложению.
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'media');
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
