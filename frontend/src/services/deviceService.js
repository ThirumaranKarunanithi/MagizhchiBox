import api from './api'

export async function listDevices() {
  const { data } = await api.get('/devices')
  return data
}

export async function removeDevice(deviceId) {
  await api.delete(`/devices/${encodeURIComponent(deviceId)}`)
}
