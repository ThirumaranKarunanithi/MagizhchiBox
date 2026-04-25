import { useState, useEffect, useRef } from 'react'

export default function CreateFolderModal({ onConfirm, onCancel }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('Folder name cannot be empty'); return }
    if (trimmed.length > 255) { setError('Name too long (max 255 chars)'); return }
    if (/[/\\]/.test(trimmed)) { setError('Name cannot contain / or \\'); return }
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] shadow-sm border border-white/50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">New Folder</h3>
            <p className="text-xs text-gray-500">Enter a name for this folder</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="Untitled Folder"
              className="input-field"
              maxLength={255}
            />
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
