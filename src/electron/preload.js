const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  selectFile: options => ipcRenderer.invoke('select-file', options),
  platform: process.platform,
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('⚡ Relampo YAML Editor - Desktop App');
});
