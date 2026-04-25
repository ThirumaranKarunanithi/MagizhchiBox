import api from './api'
import { v4 as uuidv4 } from 'uuid'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'

// On native (Android/iOS) use the hardware device identifier — it survives
// APK reinstalls so the same physical device always maps to the same slot.
// On web, fall back to a UUID stored in localStorage.
async function getOrCreateDeviceId() {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await Device.getId()
      // Cache in localStorage so the api.js request interceptor can include
      // X-Device-ID on every subsequent request (it reads from localStorage).
      localStorage.setItem('mb_device_id', info.identifier)
      return info.identifier
    } catch {
      // Plugin call failed — fall through to the localStorage UUID approach
    }
  }
  let deviceId = localStorage.getItem('mb_device_id')
  if (!deviceId) {
    deviceId = uuidv4()
    localStorage.setItem('mb_device_id', deviceId)
  }
  return deviceId
}

async function getDeviceMeta() {
  const ua = navigator.userAgent
  let deviceType = 'Desktop'
  if (/Android|iPhone|iPad|iPod/i.test(ua)) deviceType = 'Mobile'
  else if (/Tablet/i.test(ua)) deviceType = 'Tablet'

  const deviceName = `${navigator.platform} – ${
    /Chrome/i.test(ua) ? 'Chrome' :
    /Firefox/i.test(ua) ? 'Firefox' :
    /Safari/i.test(ua) ? 'Safari' : 'Browser'
  }`

  const deviceId = await getOrCreateDeviceId()
  return { deviceId, deviceName, deviceType }
}

export async function sendOtp(email) {
  const { data } = await api.post('/auth/send-otp', { email })
  return data
}

export async function sendForgotPasswordOtp(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(email, otp, newPassword) {
  const { data } = await api.post('/auth/reset-password', { email, otp, newPassword })
  return data
}

export async function signup(name, email, password, otp) {
  const { deviceId, deviceName, deviceType } = await getDeviceMeta()
  const { data } = await api.post('/auth/signup', {
    name, email, password, otp, deviceId, deviceName, deviceType,
  })
  persist(data)
  return data
}

export async function login(email, password) {
  const { deviceId, deviceName, deviceType } = await getDeviceMeta()
  const { data } = await api.post('/auth/login', {
    email, password, deviceId, deviceName, deviceType,
  })
  persist(data)
  return data
}

export function logout() {
  localStorage.removeItem('mb_token')
  localStorage.removeItem('mb_user')
}

export function getStoredUser() {
  const raw = localStorage.getItem('mb_user')
  return raw ? JSON.parse(raw) : null
}

function persist(authResponse) {
  localStorage.setItem('mb_token', authResponse.token)
  const { token: _t, ...user } = authResponse
  localStorage.setItem('mb_user', JSON.stringify(user))
}
