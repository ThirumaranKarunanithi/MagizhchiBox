import { useState, useRef } from 'react'
import { uploadFile } from '../services/fileService'
import { createFolder } from '../services/folderService'

export default function FileUpload({ currentFolderId, currentFolderName, onUploaded, onFoldersCreated }) {
  const [mode, setMode] = useState('file') // 'file' | 'folder'
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, pct: 0, name: '' })
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  // ── Single / multi file upload ────────────────────────────────────────────
  const handleFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)

    const files = Array.from(fileList)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProgress({ current: i + 1, total: files.length, pct: 0, name: file.name })
      try {
        const metadata = await uploadFile(file, currentFolderId, null, (pct) =>
          setProgress((p) => ({ ...p, pct }))
        )
        onUploaded(metadata)
      } catch (err) {
        setError(err.response?.data?.message || `Failed to upload "${file.name}"`)
        break
      }
    }

    setUploading(false)
    setProgress({ current: 0, total: 0, pct: 0, name: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Folder upload (webkitdirectory) ───────────────────────────────────────
  const handleFolderUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)

    const files = Array.from(fileList)

    // 1. Collect unique folder paths (sorted shallow → deep)
    const folderPaths = new Set()
    files.forEach(({ webkitRelativePath }) => {
      const parts = webkitRelativePath.split('/')
      for (let i = 1; i < parts.length; i++) {
        folderPaths.add(parts.slice(0, i).join('/'))
      }
    })
    const sortedPaths = Array.from(folderPaths).sort(
      (a, b) => a.split('/').length - b.split('/').length
    )

    // 2. Create folders and build path → id map
    const folderIdMap = {} // "FolderName/Sub" → folderId
    let foldersCreated = false
    for (const folderPath of sortedPaths) {
      const parts = folderPath.split('/')
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')
      const parentId = parentPath
        ? folderIdMap[parentPath]
        : currentFolderId

      try {
        const folder = await createFolder(name, parentId ?? null)
        folderIdMap[folderPath] = folder.id
        foldersCreated = true
      } catch (err) {
        // If the folder already exists the backend returns 400 — try to load it
        // by just reusing the parent + name. For simplicity we skip and continue.
        console.warn('Folder may already exist:', folderPath, err.response?.data?.message)
      }
    }

    if (foldersCreated) onFoldersCreated?.()

    // 3. Upload files
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const parts = file.webkitRelativePath.split('/')
      const folderPath = parts.slice(0, -1).join('/')
      const folderId = folderPath ? folderIdMap[folderPath] ?? currentFolderId : currentFolderId

      setProgress({ current: i + 1, total: files.length, pct: 0, name: file.name })
      try {
        const metadata = await uploadFile(file, folderId, file.webkitRelativePath || null, (pct) =>
          setProgress((p) => ({ ...p, pct }))
        )
        onUploaded(metadata)
      } catch (err) {
        setError(err.response?.data?.message || `Failed to upload "${file.name}"`)
        break
      }
    }

    setUploading(false)
    setProgress({ current: 0, total: 0, pct: 0, name: '' })
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (mode === 'file') handleFiles(e.dataTransfer.files)
  }

  const clickArea = () => {
    if (uploading) return
    if (mode === 'file') fileInputRef.current?.click()
    else folderInputRef.current?.click()
  }

  const pctLabel = progress.total > 1
    ? `${progress.current}/${progress.total} — ${progress.name} (${progress.pct}%)`
    : `${progress.name} — ${progress.pct}%`

  return (
    <div className="card">
      {/* Mode toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            Upload
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
            </svg>
            Saving to: <span className="font-medium text-gray-600">{currentFolderName || 'My Files (root)'}</span>
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
          {['file', 'folder'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={uploading}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                mode === m
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'folder' ? '📁 Folder' : '📄 Files'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore — webkitdirectory is non-standard but widely supported
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => handleFolderUpload(e.target.files)}
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (mode === 'file') setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={clickArea}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {uploading ? (
          <div className="space-y-3">
            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p className="text-sm text-gray-600 font-medium truncate max-w-xs mx-auto">
              Uploading… {pctLabel}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        ) : mode === 'file' ? (
          <>
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Drag & drop files here, or <span className="text-blue-600">click to browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Any file type · Multiple files supported · Max 500 MB each</p>
          </>
        ) : (
          <>
            <svg className="w-12 h-12 text-amber-400 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
            </svg>
            <p className="text-sm font-medium text-gray-700">
              Click to <span className="text-blue-600">select a folder</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              The entire folder structure will be recreated here
            </p>
          </>
        )}
      </div>
    </div>
  )
}
