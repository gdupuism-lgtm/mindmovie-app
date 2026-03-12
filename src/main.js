const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// ── AUTO-START EN BOOT ──
app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true
});

let widgetWindow = null;
let settingsWindow = null;
let tray = null;

// ── CREAR WIDGET (ventana flotante siempre encima) ──
function createWidget() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  widgetWindow = new BrowserWindow({
    width: 280,
    height: 158,
    x: width - 300,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // permite cargar archivos locales
    }
  });

  widgetWindow.loadFile('src/widget.html');
  widgetWindow.setAlwaysOnTop(true, 'screen-saver'); // máximo nivel
  widgetWindow.setVisibleOnAllWorkspaces(true);

  // Drag para mover el widget
  widgetWindow.on('close', (e) => {
    e.preventDefault(); // no cerrar, solo ocultar
    widgetWindow.hide();
  });
}

// ── CREAR VENTANA DE CONFIGURACIÓN ──
function createSettings() {
  if (settingsWindow) { settingsWindow.focus(); return; }

  settingsWindow = new BrowserWindow({
    width: 520,
    height: 700,
    frame: false,
    transparent: false,
    resizable: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  settingsWindow.loadFile('src/settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ── TRAY (ícono en la barra del sistema) ──
function createTray() {
  // Ícono simple si no hay icns/ico
  const iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  tray = new Tray(icon);

  const menu = Menu.buildFromTemplate([
    { label: 'ERIORCENTER Mind Movie', enabled: false },
    { type: 'separator' },
    { label: 'Mostrar Widget',    click: () => widgetWindow.show() },
    { label: 'Ocultar Widget',   click: () => widgetWindow.hide() },
    { type: 'separator' },
    { label: '⚙ Configuración',  click: () => createSettings() },
    { type: 'separator' },
    { label: 'Salir',            click: () => { app.exit(0); } }
  ]);

  tray.setToolTip('ERIORCENTER Mind Movie');
  tray.setContextMenu(menu);
  tray.on('double-click', () => createSettings());
}

// ── IPC: comunicación widget ↔ settings ──
ipcMain.on('set-video', (e, filePath) => {
  widgetWindow.webContents.send('load-video', filePath);
  widgetWindow.show();
});

ipcMain.on('set-audio', (e, filePath) => {
  widgetWindow.webContents.send('load-audio', filePath);
});

ipcMain.on('set-size', (e, size) => {
  const sizes = { small: [180,101], medium: [280,158], large: [360,203] };
  const [w, h] = sizes[size] || sizes.medium;
  widgetWindow.setSize(w, h);
  widgetWindow.webContents.send('set-size', size);
});

ipcMain.on('set-position', (e, pos) => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const [ww, wh] = widgetWindow.getSize();
  const margin = 20;
  const positions = {
    tr: [width - ww - margin, margin],
    tl: [margin, margin],
    br: [width - ww - margin, height - wh - margin],
    bl: [margin, height - wh - margin],
  };
  const [x, y] = positions[pos] || positions.tr;
  widgetWindow.setPosition(x, y);
});

ipcMain.on('set-mode', (e, mode) => {
  widgetWindow.webContents.send('set-mode', mode);
});

ipcMain.on('set-volumes', (e, data) => {
  widgetWindow.webContents.send('set-volumes', data);
});

ipcMain.on('set-affirmation', (e, text) => {
  widgetWindow.webContents.send('set-affirmation', text);
});

ipcMain.on('set-interval', (e, secs) => {
  widgetWindow.webContents.send('set-interval', secs);
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) settingsWindow.close();
});

ipcMain.on('toggle-widget', () => {
  widgetWindow.isVisible() ? widgetWindow.hide() : widgetWindow.show();
});

// ── APP READY ──
app.whenReady().then(() => {
  createWidget();
  createTray();

  // Abrir settings la primera vez
  createSettings();
});

app.on('window-all-closed', (e) => {
  e.preventDefault(); // no cerrar la app aunque cierren ventanas
});
