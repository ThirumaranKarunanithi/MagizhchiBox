import api from './api'

export async function listFolders(parentId = null) {
  const params = parentId != null ? { parentId } : {}
  const { data } = await api.get('/folders', { params })
  return data
}

export async function getFolder(folderId) {
  const { data } = await api.get(`/folders/${folderId}`)
  return data
}

export async function createFolder(name, parentId = null) {
  const { data } = await api.post('/folders', { name, parentId })
  return data
}

export async function deleteFolder(folderId) {
  await api.delete(`/folders/${folderId}`)
}
