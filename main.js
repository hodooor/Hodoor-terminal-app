'use strict';
var ipc = require("electron").ipcMain
var request = require('request')

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

var AutoLaunch = require('auto-launch');

var appLauncher = new AutoLaunch({
    name: 'Hodoor-client',
});

appLauncher.isEnabled().then(function(enabled){
    if(enabled) return;
    return appLauncher.enable()
}).then(function(err){
    console.log("Error is:" + err)
});

function createWindow () {
  // Create the browser window.


    if(process.arch == "arm"){
        mainWindow = new BrowserWindow({
            kiosk: true,
            useContentSize: true,
            alwaysOnTop:true
        });
        console.log("We are on Raspberry Pi :)");
    }
    else{
        mainWindow = new BrowserWindow({
            width: 800,
            height: 480,
            resizable: false,
            x: 0,
            y:0,
            useContentSize: true,
        });
    }
    //TODO: Figure out why mainWindow.kiosk = true cant be used


    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/index.html');


    mainWindow.setMenu(null)
    // Open the DevTools.
    if(process.arch !== "arm"){
        mainWindow.webContents.openDevTools({detach: true});
    }


    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
    mainWindow.webContents.on('devtools-opened', function(){
        //console.log("dev ");
        mainWindow.focus();
        console.log(mainWindow.isFocused())
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);
console.log("App is ON!");
console.log(process.arch)



// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
}
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
}
});
