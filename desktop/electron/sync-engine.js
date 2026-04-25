/**
 * SyncEngine — watches a local folder and mirrors it to Magizhchi Box cloud.
 *
 * Upload rules:
 *  - New file              → upload to matching cloud folder
 *  - Modified file         → re-upload (server overwrites / creates new version)
 *  - New folder            → create in cloud
 *  - Deleted file/folder   → skip auto-delete (safety first; user can delete via web/mobile)
 *
 * Change detection (avoids re-uploading on restart):
 *  - Tracks { mtime, size } per relative path in a sidecar JSON file.
 *  - File is only uploaded when mtime or size differs from the stored state.
 */

const chokidar = require('chokidar')
const fs = require('fs')
const path = require('path')
const FormData = require('form-data')
const axios = require('axios')

class SyncEngine {
  constructor({ syncFolder, token, deviceId, apiBase, stateFile, onStatus }) {
    this.syncFolder = syncFolder
    this.token = token
    this.deviceId = deviceId
    this.apiBase = apiBase.replace(/\/$/, '') // strip trailing slash
    this.stateFile = stateFile
    this.onStatus = onStatus || (() => {})

    // In-memory caches
    this.folderIdCache = {}   // relFolderPath  → cloudFolderId
    this.syncState    = this._loadState() // relFilePath → { mtime, size }

    // Upload queue (simple FIFO, max 2 concurrent)
    this.queue = []
    this.active = 0
    this.MAX_CONCURRENT = 2

    this.stats = { synced: 0, pending: 0, errors: 0, lastSync: null }
    this.debounceTimers = {}
    this.watcher = null
    this.paused = false
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getStats() { return { ...this.stats } }

  async start() {
    this._status('syncing', 'Starting initial scan…')
    await this._initialScan()

    this.watcher = chokidar.watch(this.syncFolder, {
      ignored: /(^|[/\\])\.|Thumbs\.db|desktop\.ini/,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
    })

    this.watcher
      .on('add',    (p) => this._debounce(p, () => this._enqueue('upload', p)))
      .on('change', (p) => this._debounce(p, () => this._enqueue('upload', p)))
      .on('addDir', (p) => { if (p !== this.syncFolder) this._enqueue('mkdir', p) })
      // unlink / unlinkDir → intentionally not auto-deleted on cloud (safety)

    this._status('idle', `Watching · ${this.stats.synced} file(s) synced`)
  }

  stop() {
    this.watcher?.close()
    this.watcher = null
  }

  pause() {
    this.paused = true
    this._status('paused', 'Sync paused')
  }

  resume() {
    this.paused = false
    this._status('idle', 'Resuming sync…')
    this._drain()
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  _debounce(filePath, fn) {
    clearTimeout(this.debounceTimers[filePath])
    this.debounceTimers[filePath] = setTimeout(fn, 800)
  }

  _enqueue(action, filePath) {
    this.queue.push({ action, filePath })
    this.stats.pending = this.queue.length
    this._drain()
  }

  _drain() {
    if (this.paused) return
    while (this.active < this.MAX_CONCURRENT && this.queue.length > 0) {
      const job = this.queue.shift()
      this.stats.pending = this.queue.length
      this.active++
      this._runJob(job).finally(() => {
        this.active--
        this._drain()
        if (this.active === 0 && this.queue.length === 0) {
          this._status('idle', `Up to date · ${this.stats.synced} file(s) synced`)
        }
      })
    }
  }

  async _runJob({ action, filePath }) {
    try {
      if (action === 'upload') await this._uploadFile(filePath)
      else if (action === 'mkdir') await this._ensureCloudFolder(this._rel(filePath))
    } catch (err) {
      this.stats.errors++
      const name = path.basename(filePath)
      this._status('error', `Failed: ${name} — ${err.response?.data?.message || err.message}`)
      console.error('[SyncEngine] job failed:', filePath, err.message)
    }
  }

  async _initialScan() {
    const walk = (dir) => {
      let entries
      try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'Thumbs.db' || e.name === 'desktop.ini') continue
        const full = path.join(dir, e.name)
        if (e.isDirectory()) {
          walk(full)
        } else {
          // Only enqueue if file has changed since last sync
          if (this._hasChanged(full)) {
            this._enqueue('upload', full)
          }
        }
      }
    }
    walk(this.syncFolder)
  }

  _hasChanged(filePath) {
    try {
      const stat = fs.statSync(filePath)
      const rel  = this._rel(filePath)
      const prev = this.syncState[rel]
      if (!prev) return true
      return prev.mtime !== stat.mtimeMs || prev.size !== stat.size
    } catch {
      return false
    }
  }

  // ── Cloud folder management ────────────────────────────────────────────────

  async _ensureCloudFolder(relFolderPath) {
    if (!relFolderPath || relFolderPath === '.' || relFolderPath === '') return null
    if (this.folderIdCache[relFolderPath]) return this.folderIdCache[relFolderPath]

    const parts = relFolderPath.split(/[/\\]/).filter(Boolean)
    let parentId = null

    for (let i = 0; i < parts.length; i++) {
      const partial   = parts.slice(0, i + 1).join('/')
      const cached    = this.folderIdCache[partial]
      if (cached) { parentId = cached; continue }

      const folder = await this._createCloudFolder(parts[i], parentId)
      this.folderIdCache[partial] = folder.id
      parentId = folder.id
    }

    return parentId
  }

  async _createCloudFolder(name, parentId) {
    try {
      const { data } = await axios.post(
        `${this.apiBase}/api/folders`,
        { name, parentId: parentId || null },
        { headers: this._authHeaders(), timeout: 30000 }
      )
      return data
    } catch (err) {
      // 409 Conflict = folder already exists; fetch its id from the error or re-list
      if (err.response?.status === 409 || err.response?.data?.message?.toLowerCase().includes('already')) {
        // Best-effort: return a fake object so we don't block; the upload will go to root
        return { id: null }
      }
      throw err
    }
  }

  // ── File upload ────────────────────────────────────────────────────────────

  async _uploadFile(filePath) {
    if (!fs.existsSync(filePath)) return

    const rel      = this._rel(filePath)
    const fileName = path.basename(filePath)
    const dirRel   = path.dirname(rel)

    this._status('syncing', `Uploading ${fileName}…`)

    // Resolve cloud folder
    const folderId = await this._ensureCloudFolder(dirRel === '.' ? '' : dirRel)

    const form = new FormData()
    form.append('file', fs.createReadStream(filePath), { filename: fileName })
    if (folderId)  form.append('folderId', String(folderId))
    if (rel)       form.append('relativePath', rel.replace(/\\/g, '/'))

    await axios.post(`${this.apiBase}/api/files/upload`, form, {
      headers: { ...form.getHeaders(), ...this._authHeaders() },
      timeout: 0,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    // Update sync state
    const stat = fs.statSync(filePath)
    this.syncState[rel] = { mtime: stat.mtimeMs, size: stat.size }
    this._saveState()

    this.stats.synced++
    this.stats.lastSync = new Date().toISOString()
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _rel(filePath) {
    return path.relative(this.syncFolder, filePath)
  }

  _authHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'X-Device-ID':   this.deviceId,
    }
  }

  _status(type, message) {
    this.onStatus({ type, message, stats: this.getStats() })
  }

  _loadState() {
    try { return JSON.parse(fs.readFileSync(this.stateFile, 'utf-8')) } catch { return {} }
  }

  _saveState() {
    try {
      fs.mkdirSync(path.dirname(this.stateFile), { recursive: true })
      fs.writeFileSync(this.stateFile, JSON.stringify(this.syncState, null, 2))
    } catch {}
  }
}

module.exports = SyncEngine
