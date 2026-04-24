import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import FileUpload from '../components/FileUpload'
import FileBrowser from '../components/FileBrowser'
import CreateFolderModal from '../components/CreateFolderModal'
import DeviceManager from '../components/DeviceManager'
import { listFiles } from '../services/fileService'
import { createFolder } from '../services/folderService'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, updateStorageInfo } = useAuth()
  const [activeTab, setActiveTab] = useState('files')

  // Folder navigation state
  const [folderPath, setFolderPath] = useState([]) // [{id, name}, ...]  — root = empty
  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null
  const currentFolderName = folderPath.length > 0 ? folderPath[folderPath.length - 1].name : null

  // Files in current folder
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // Folder refresh trigger
  const [folderRefreshKey, setFolderRefreshKey] = useState(0)
  const refreshFolders = () => setFolderRefreshKey((k) => k + 1)

  // Create folder modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)

  const fetchFiles = useCallback(async () => {
    setLoadingFiles(true)
    setFetchError('')
    try {
      const data = await listFiles(currentFolderId)
      setFiles(data)
    } catch {
      setFetchError('Could not load files. Please refresh.')
    } finally {
      setLoadingFiles(false)
    }
  }, [currentFolderId])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  // Navigate into a folder
  const navigateInto = (folder) => {
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }])
    setFiles([])
  }

  // Breadcrumb navigation — click on an ancestor
  const navigateTo = (index) => {
    setFolderPath((prev) => prev.slice(0, index + 1))
    setFiles([])
  }

  const handleUploaded = (newFile) => {
    setFiles((prev) => [newFile, ...prev])
    updateStorageInfo((user?.storageUsedBytes || 0) + (newFile.fileSizeBytes || 0))
  }

  const handleDeleted = (fileId) => {
    const removed = files.find((f) => f.id === fileId)
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    if (removed) {
      updateStorageInfo(Math.max(0, (user?.storageUsedBytes || 0) - (removed.fileSizeBytes || 0)))
    }
  }

  const handleCreateFolder = async (name) => {
    setCreatingFolder(true)
    try {
      const folder = await createFolder(name, currentFolderId)
      setShowCreateModal(false)
      navigateInto(folder)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {showCreateModal && (
        <CreateFolderModal
          onConfirm={handleCreateFolder}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Securely store and access your files from anywhere.
          </p>
        </div>

        {activeTab === 'files' && (
          <div className="space-y-4">
            {/* Breadcrumb + Back button + New Folder button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                {/* Back button — only shown when inside a folder */}
                {folderPath.length > 0 && (
                  <button
                    onClick={() => {
                      if (folderPath.length === 1) setFolderPath([])
                      else setFolderPath((prev) => prev.slice(0, -1))
                      setFiles([])
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium
                               bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Go back"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                    </svg>
                    Back
                  </button>
                )}

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1 text-sm flex-wrap">
                  <button
                    onClick={() => { setFolderPath([]); setFiles([]) }}
                    className={`font-medium transition-colors flex items-center gap-1 ${
                      folderPath.length === 0
                        ? 'text-gray-900 cursor-default'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    My Files
                  </button>
                  {folderPath.map((crumb, idx) => (
                    <span key={crumb.id} className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                      <button
                        onClick={() => { navigateTo(idx) }}
                        className={`font-medium transition-colors ${
                          idx === folderPath.length - 1
                            ? 'text-gray-900 cursor-default'
                            : 'text-blue-600 hover:text-blue-700'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Upload buttons */}
                <FileUpload
                  currentFolderId={currentFolderId}
                  onUploaded={handleUploaded}
                  onFoldersCreated={refreshFolders}
                />

                {/* New Folder button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                             bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors"
                  disabled={creatingFolder}
                >
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                  </svg>
                  New Folder
                </button>
              </div>
            </div>

            {/* Unified folder + file browser */}
            {fetchError ? (
              <div className="card flex items-center justify-between">
                <p className="text-red-600 text-sm">{fetchError}</p>
                <button onClick={fetchFiles} className="btn-secondary text-sm">Retry</button>
              </div>
            ) : (
              <FileBrowser
                currentFolderId={currentFolderId}
                files={files}
                loadingFiles={loadingFiles}
                onNavigate={navigateInto}
                onFolderDeleted={refreshFolders}
                onFileDeleted={handleDeleted}
                refreshKey={folderRefreshKey}
              />
            )}
          </div>
        )}

        {activeTab === 'devices' && <DeviceManager />}
      </main>
    </div>
  )
}
