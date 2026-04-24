import { useState } from 'react'
import { getDownloadUrl, deleteFile } from '../services/fileService'

const FILE_ICONS = {
  image: (
    <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
    </svg>
  ),
  video: (
    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
    </svg>
  ),
  pdf: (
    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
    </svg>
  ),
  default: (
    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
    </svg>
  ),
}

function getIcon(contentType) {
  if (!contentType) return FILE_ICONS.default
  if (contentType.startsWith('image/')) return FILE_ICONS.image
  if (contentType.startsWith('video/')) return FILE_ICONS.video
  if (contentType === 'application/pdf') return FILE_ICONS.pdf
  return FILE_ICONS.default
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function FileList({ files, onDeleted }) {
  const [selected, setSelected] = useState(new Set())
  const [loadingId, setLoadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [error, setError] = useState('')

  const allSelected = files.length > 0 && selected.size === files.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(files.map((f) => f.id)))
    }
  }

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Single file actions ────────────────────────────────────────────────────
  const handleDownload = async (file) => {
    setError('')
    setLoadingId(file.id)
    try {
      triggerDownload(await getDownloadUrl(file.id), file.originalFileName)
    } catch {
      setError('Failed to generate download link.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (file) => {
    if (!window.confirm(`Delete "${file.originalFileName}"? This cannot be undone.`)) return
    setError('')
    setDeletingId(file.id)
    try {
      await deleteFile(file.id)
      onDeleted(file.id)
      setSelected((prev) => { const n = new Set(prev); n.delete(file.id); return n })
    } catch {
      setError('Failed to delete file.')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkDownload = async () => {
    setError('')
    setBulkDownloading(true)
    try {
      for (const id of selected) {
        const file = files.find((f) => f.id === id)
        if (!file) continue
        const url = await getDownloadUrl(id)
        triggerDownload(url, file.originalFileName)
        // Small delay so the browser doesn't block multiple downloads
        await new Promise((r) => setTimeout(r, 300))
      }
    } catch {
      setError('One or more downloads failed.')
    } finally {
      setBulkDownloading(false)
    }
  }

  const handleBulkDelete = async () => {
    const count = selected.size
    if (!window.confirm(`Delete ${count} file${count > 1 ? 's' : ''}? This cannot be undone.`)) return
    setError('')
    setBulkDeleting(true)
    const ids = Array.from(selected)
    for (const id of ids) {
      try {
        await deleteFile(id)
        onDeleted(id)
        setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
      } catch {
        setError(`Failed to delete one or more files.`)
      }
    }
    setBulkDeleting(false)
  }

  function triggerDownload(url, fileName) {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (files.length === 0) {
    return (
      <div className="card text-center py-16">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
        </svg>
        <p className="text-gray-500 font-medium">No files yet</p>
        <p className="text-gray-400 text-sm mt-1">Upload your first file to get started</p>
      </div>
    )
  }

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-3">
          {/* Select-all checkbox */}
          <button
            onClick={toggleAll}
            className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                       focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
                       border-gray-300 hover:border-blue-400"
            aria-label={allSelected ? 'Deselect all' : 'Select all'}
          >
            {allSelected && (
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
              </svg>
            )}
            {someSelected && (
              <span className="w-2 h-0.5 bg-blue-500 rounded"/>
            )}
          </button>

          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            {selected.size > 0
              ? <span>{selected.size} of {files.length} selected</span>
              : <span>My Files <span className="text-gray-400 font-normal text-sm">({files.length})</span></span>
            }
          </h3>
        </div>

        {/* Bulk action bar — visible when any are selected */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkDownload}
              disabled={bulkDownloading || bulkDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                         bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {bulkDownloading ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
              )}
              Download
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting || bulkDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                         bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {bulkDeleting ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              )}
              Delete
            </button>

            <button
              onClick={() => setSelected(new Set())}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* File rows */}
      <div className="divide-y divide-gray-100">
        {files.map((file) => {
          const isSelected = selected.has(file.id)
          return (
            <div
              key={file.id}
              onClick={() => toggleOne(file.id)}
              className={`flex items-center gap-3 py-3 group cursor-pointer rounded-lg px-1 -mx-1
                          transition-colors select-none
                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              {/* Row checkbox */}
              <div
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                  ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}
              >
                {isSelected && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                )}
              </div>

              <div className="flex-shrink-0 w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                {getIcon(file.contentType)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.originalFileName}</p>
                <p className="text-xs text-gray-400">
                  {formatBytes(file.fileSizeBytes)} · {formatDate(file.uploadedAt)}
                </p>
              </div>

              {/* Per-row actions — stop propagation so clicking them doesn't toggle selection */}
              <div
                className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleDownload(file)}
                  disabled={loadingId === file.id || bulkDeleting}
                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Download"
                >
                  {loadingId === file.id ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                  )}
                </button>

                <button
                  onClick={() => handleDelete(file)}
                  disabled={deletingId === file.id || bulkDeleting}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === file.id ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
