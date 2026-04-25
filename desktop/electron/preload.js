const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mb', {
  // ── Auth ──────────────────────────────────────────────────────────────────
  getAuth:      ()     => ipcRenderer.invoke('get-auth'),
  saveAuth:     (data) => ipcRenderer.invoke('save-auth', data),
  clearAuth:    ()     => ipcRenderer.invoke('clear-auth'),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSyncFolder:    ()    => ipcRenderer.invoke('get-sync-folder'),
  chooseSyncFolder: ()    => ipcRenderer.invoke('choose-sync-folder'),
  getApiBase:       ()    => ipcRenderer.invoke('get-api-base'),
  setApiBase:       (url) => ipcRenderer.invoke('set-api-base', url),

  // ── Sync control ──────────────────────────────────────────────────────────
  startSync:    ()  => ipcRenderer.invoke('start-sync'),
  pauseSync:    ()  => ipcRenderer.invoke('pause-sync'),
  resumeSync:   ()  => ipcRenderer.invoke('resume-sync'),
  getSyncStats: ()  => ipcRenderer.invoke('get-sync-stats'),

  // ── Sync status events ────────────────────────────────────────────────────
  onSyncStatus: (cb) => {
    const handler = (_, payload) => cb(payload)
    ipcRenderer.on('sync-status', handler)
    return () => ipcRenderer.removeListener('sync-status', handler)
  },

  // ── Window controls ───────────────────────────────────────────────────────
  minimize: () => ipcRenderer.invoke('win-minimize'),
  hide:     () => ipcRenderer.invoke('win-hide'),
})
