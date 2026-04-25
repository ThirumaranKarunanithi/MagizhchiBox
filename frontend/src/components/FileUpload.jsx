import { useState, useRef } from 'react'
import { uploadFile } from '../services/fileService'
import { createFolder } from '../services/folderService'

export default function FileUpload({ currentFolderId, onUploaded, onFoldersCreated }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, pct: 0, name: '' })
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  // ── Single / multi file upload ─────────────────────────────────────────────
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
        setError(err.response?.data?.message || err.message || `Failed to upload "${file.name}"`)
        break
      }
    }
    setUploading(false)
    setProgress({ current: 0, total: 0, pct: 0, name: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Folder upload (webkitdirectory) ────────────────────────────────────────
  const handleFolderUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return
    setError('')
    setUploading(true)

    const files = Array.from(fileList)

    // Collect unique folder paths sorted shallow → deep
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

    // Create folders and build path → id map
    const folderIdMap = {}
    let foldersCreated = false
    for (const folderPath of sortedPaths) {
      const parts = folderPath.split('/')
      const name = parts[parts.length - 1]
      const parentPath = parts.slice(0, -1).join('/')
      const parentId = parentPath ? folderIdMap[parentPath] : currentFolderId
      try {
        const folder = await createFolder(name, parentId ?? null)
        folderIdMap[folderPath] = folder.id
        foldersCreated = true
      } catch (err) {
        console.warn('Folder may already exist:', folderPath, err.response?.data?.message)
      }
    }
    if (foldersCreated) onFoldersCreated?.()

    // Upload files
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
        setError(err.response?.data?.message || err.message || `Failed to upload "${file.name}"`)
        break
      }
    }

    setUploading(false)
    setProgress({ current: 0, total: 0, pct: 0, name: '' })
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  const pctLabel = progress.total > 1
    ? `${progress.current}/${progress.total} — ${progress.name} (${progress.pct}%)`
    : `${progress.name} (${progress.pct}%)`

  return (
    <div className="flex items-center gap-2 flex-wrap">
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
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={(e) => handleFolderUpload(e.target.files)}
      />

      {/* Upload File button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold min-h-[44px]
                   bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        Upload File
      </button>

      {/* Upload Folder button */}
      <button
        onClick={() => folderInputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium min-h-[44px]
                   bg-white/80 hover:bg-white backdrop-blur-sm text-gray-700 border border-white/60
                   shadow-sm transition-all disabled:opacity-50 hover:-translate-y-0.5 disabled:hover:translate-y-0"
      >
        <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
        </svg>
        Upload Folder
      </button>

      {/* Inline progress */}
      {uploading && (
        <div className="flex items-center gap-2 ml-2">
          <svg className="animate-spin h-4 w-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-white drop-shadow-sm font-medium truncate max-w-[200px]">{pctLabel}</span>
            <div className="w-32 h-1 bg-gray-200 rounded-full mt-0.5">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Inline error */}
      {error && !uploading && (
        <span className="text-xs text-red-200 drop-shadow-md font-medium ml-2 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
          </svg>
          {error}
          <button onClick={() => setError('')} className="ml-1 underline">Dismiss</button>
        </span>
      )}
    </div>
  )
}
