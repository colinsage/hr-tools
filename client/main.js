const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

var email = require('./email/email')
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
//app.on('ready', createWindow)
let win

let session
app.on('ready', () => {
  win = new BrowserWindow({width: 1024, height: 768} )
  win.loadURL('http://' + email.remoteHost+ '/outer/login.html')

  session = win.webContents.session;

  //url: 'http://' + email.remoteHost


 // win.webContents.openDevTools()
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

const ipcMain = require('electron').ipcMain;

ipcMain.on('send-email',  (event, arg) => {
  console.log('session:', session.cookies);

  win.webContents.session.cookies.get({ url:'http://' + email.remoteHost}, function(error, cookies){
    console.log('cookies:', cookies)
    var cookie_str;
    for(var i=cookies.length -1;i>=0;i--){
      var cookie = cookies[i]
      if(cookie.name == 'connect.sid')
        cookie_str = cookie.name+ '='+ cookie.value
        arg.cookie_str = cookie_str;
        email.send(arg)
        event.sender.send('send-ok',  arg.subject + 'electron');
    }
  });


})
