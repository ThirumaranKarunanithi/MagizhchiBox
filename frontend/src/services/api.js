import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60 s — covers Railway cold-start (~30-50 s on first wake)
})

// Attach JWT + Device ID to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mb_token')
  const deviceId = localStorage.getItem('mb_device_id')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  if (deviceId) config.headers['X-Device-ID'] = deviceId

  // For FormData (file uploads) the browser MUST set Content-Type itself so
  // it can include the multipart boundary.  Remove the axios instance default
  // ('application/json') so the browser can do the right thing.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

// Global response interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('mb_token')
      localStorage.removeItem('mb_user')
      window.location.href = '/login'
    }
    // Normalise network / timeout errors so callers always get a readable message
    if (!err.response) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout')
      err.message = isTimeout
        ? 'Request timed out. Please check your connection and try again.'
        : 'Unable to reach the server. Please check your internet connection.'
    }
    return Promise.reject(err)
  }
)

export default api
