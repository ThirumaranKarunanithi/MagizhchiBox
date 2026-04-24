import api from './api'

export async function listFiles(folderId = null) {
  const params = folderId != null ? { folderId } : {}
  const { data } = await api.get('/files', { params })
  return data
}

/**
 * Upload a single file.
 * @param {File}        file         - the File object
 * @param {number|null} folderId     - DB folder id (null = root)
 * @param {string|null} relativePath - webkitRelativePath for folder uploads,
 *                                     used to mirror the S3 key structure
 * @param {function}    onProgress   - (pct: number) => void
 */
export async function uploadFile(file, folderId = null, relativePath = null, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  if (folderId != null) formData.append('folderId', folderId)
  if (relativePath) formData.append('relativePath', relativePath)
  const { data } = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
    },
  })
  return data
}

export async function getDownloadUrl(fileId) {
  const { data } = await api.get(`/files/${fileId}/download-url`)
  return data.url
}

export async function deleteFile(fileId) {
  await api.delete(`/files/${fileId}`)
}
