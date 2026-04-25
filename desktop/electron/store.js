/**
 * Lightweight persistent key-value store backed by a JSON file in userData.
 * Avoids the ESM-only electron-store v8+ dependency.
 */
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

class Store {
  constructor(filename = 'config.json') {
    this._file = path.join(app.getPath('userData'), filename)
    this._data = this._load()
  }

  _load() {
    try {
      return JSON.parse(fs.readFileSync(this._file, 'utf-8'))
    } catch {
      return {}
    }
  }

  _save() {
    fs.mkdirSync(path.dirname(this._file), { recursive: true })
    fs.writeFileSync(this._file, JSON.stringify(this._data, null, 2))
  }

  get(key) { return this._data[key] }

  set(key, value) { this._data[key] = value; this._save() }

  delete(key) { delete this._data[key]; this._save() }

  clear() { this._data = {}; this._save() }
}

module.exports = Store
