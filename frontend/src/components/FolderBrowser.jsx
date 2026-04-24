import { useState, useEffect } from 'react'
import { listFolders, deleteFolder as svcDelete } from '../services/folderService'

function FolderIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
    </svg>
  )
}

export default function FolderBrowser({ currentFolderId, onNavigate, onFolderDeleted, refreshKey }) {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    listFolders(currentFolderId)
      .then((data) => { if (!cancelled) setFolders(data) })
      .catch((err) => {
        if (!cancelled) {
          const status = err?.response?.status
          // 404 means the backend hasn't been restarted yet with the folder feature —
          // silently show nothing rather than an alarming error.
          if (status !== 404) setError('Failed to load folders — check backend logs')
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentFolderId, refreshKey])

  const handleDelete = async (e, folder) => {
    e.stopPropagation()
    if (!window.confirm(
      `Delete folder "${folder.name}"?\n\nAll files inside will be moved to the current location.`
    )) return
    setDeletingId(folder.id)
    try {
      await svcDelete(folder.id)
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
      onFolderDeleted?.()
    } catch {
      setError('Failed to delete folder')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
      Loading folders…
    </div>
  )

  if (error) return <p className="text-red-600 text-sm py-2">{error}</p>

  if (folders.length === 0) return null

  return (
    <div className="mb-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onNavigate(folder)}
            className="group relative flex items-center gap-2 p-3 bg-amber-50 hover:bg-amber-100
                       border border-amber-200 rounded-xl cursor-pointer transition-all select-none"
          >
            <FolderIcon className="w-7 h-7 text-amber-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate flex-1 min-w-0">
              {folder.name}
            </span>

            {/* Delete button — visible on hover */}
            <button
              onClick={(e) => handleDelete(e, folder)}
              disabled={deletingId === folder.id}
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/80 hover:bg-red-100
                         text-gray-400 hover:text-red-500 flex items-center justify-center
                         opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              title="Delete folder"
            >
              {deletingId === folder.id ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
