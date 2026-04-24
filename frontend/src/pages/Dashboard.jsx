import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import FileUpload from '../components/FileUpload'
import FileList from '../components/FileList'
import FolderBrowser from '../components/FolderBrowser'
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
            {/* Breadcrumb + New Folder button */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <nav className="flex items-center gap-1 text-sm flex-wrap">
                <button
                  onClick={() => setFolderPath([])}
                  className={`font-medium transition-colors ${
                    folderPath.length === 0
                      ? 'text-gray-900 cursor-default'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  My Files
                </button>
                {folderPath.map((crumb, idx) => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                    <button
                      onClick={() => navigateTo(idx)}
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

              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-secondary flex items-center gap-1.5 text-sm"
                disabled={creatingFolder}
              >
                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                </svg>
                New Folder
              </button>
            </div>

            {/* Upload area */}
            <FileUpload
              currentFolderId={currentFolderId}
              currentFolderName={currentFolderName}
              onUploaded={handleUploaded}
              onFoldersCreated={refreshFolders}
            />

            {/* Folder grid */}
            <FolderBrowser
              currentFolderId={currentFolderId}
              onNavigate={navigateInto}
              onFolderDeleted={refreshFolders}
              refreshKey={folderRefreshKey}
            />

            {/* File list */}
            {loadingFiles ? (
              <div className="card flex justify-center py-12">
                <svg className="animate-spin h-7 w-7 text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              </div>
            ) : fetchError ? (
              <div className="card flex items-center justify-between">
                <p className="text-red-600 text-sm">{fetchError}</p>
                <button onClick={fetchFiles} className="btn-secondary text-sm">Retry</button>
              </div>
            ) : (
              <FileList files={files} onDeleted={handleDeleted} />
            )}
          </div>
        )}

        {activeTab === 'devices' && <DeviceManager />}
      </main>
    </div>
  )
}
