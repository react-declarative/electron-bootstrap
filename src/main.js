const { app, dialog, BrowserWindow } = require('electron')
const path = require('node:path')

const handler = require('serve-handler');
const http = require('http');

const APP_PORT = 1338;

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=16384');
app.commandLine.appendSwitch("disable-http-cache");

const uri = path.join(path.dirname(app.getPath('exe')), 'resources');

const server = http.createServer((request, response) => {
  return handler(request, response, {
    public: uri,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    },
  });
});

const startServer = () => new Promise((resolve, reject) => {
  let startFinished = false;
  server.listen(APP_PORT, () => {
    if (!startFinished) {
      startFinished = true;
      resolve();
    }
  });
  server.once('error', (err) => {
    if (!startFinished) {
      startFinished = true;
      reject(err);
    }
  });
});

async function createWindow () {

  try {
    await startServer();
  } catch {
    dialog.showErrorBox('Application Error', `An unexpected error occurred. Looks like port ${APP_PORT} is busy`);
    app.quit();
    process.exit(1);
  }
  
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      webSecurity: false,
      sandbox: false,
    }
  });

  mainWindow.removeMenu();

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);

  mainWindow.loadURL(`http://localhost:${APP_PORT}`, {
    extraHeaders: "pragma: no-cache\n"
  });
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', () => {
  server.close();
})
