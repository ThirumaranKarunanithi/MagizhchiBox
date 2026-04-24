import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT + Device ID to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mb_token')
  const deviceId = localStorage.getItem('mb_device_id')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  if (deviceId) config.headers['X-Device-ID'] = deviceId
  return config
})

// Global 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mb_token')
      localStorage.removeItem('mb_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
