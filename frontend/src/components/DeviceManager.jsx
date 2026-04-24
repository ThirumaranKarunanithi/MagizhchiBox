import { useState, useEffect } from 'react'
import { listDevices, removeDevice } from '../services/deviceService'

function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DeviceManager() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState(null)
  const [error, setError] = useState('')
  const currentDeviceId = localStorage.getItem('mb_device_id')

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listDevices()
      setDevices(data)
    } catch {
      setError('Failed to load devices.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (deviceId) => {
    if (deviceId === currentDeviceId) {
      if (!window.confirm('Removing this device will sign you out. Continue?')) return
    } else {
      if (!window.confirm('Remove this device?')) return
    }
    setError('')
    setRemovingId(deviceId)
    try {
      await removeDevice(deviceId)
      setDevices((prev) => prev.map((d) =>
        d.deviceId === deviceId ? { ...d, active: false } : d
      ))
    } catch {
      setError('Failed to remove device.')
    } finally {
      setRemovingId(null)
    }
  }

  const activeDevices = devices.filter((d) => d.active)
  const inactiveDevices = devices.filter((d) => !d.active)

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            Logged-in Devices
          </h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            activeDevices.length >= 2
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {activeDevices.length} / 2 active
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Your account is limited to <strong>2 active devices</strong>. Remove a device below to log in from a new one.
        </p>

        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : activeDevices.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No active devices found.</p>
        ) : (
          <div className="space-y-3">
            {activeDevices.map((device) => {
              const isCurrent = device.deviceId === currentDeviceId
              return (
                <div key={device.deviceId} className={`flex items-start gap-3 p-3 rounded-xl border
                  ${isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    ${isCurrent ? 'bg-blue-100' : 'bg-gray-200'}`}
                  >
                    <svg className={`w-5 h-5 ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">{device.deviceName || 'Unknown Device'}</p>
                      {isCurrent && (
                        <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{device.deviceType}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Last active: {formatDate(device.lastLoginAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemove(device.deviceId)}
                    disabled={removingId === device.deviceId}
                    className="btn-danger flex-shrink-0 disabled:opacity-50"
                  >
                    {removingId === device.deviceId ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {inactiveDevices.length > 0 && (
        <div className="card">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Previously Used Devices
          </h4>
          <div className="space-y-2">
            {inactiveDevices.map((device) => (
              <div key={device.deviceId} className="flex items-center gap-3 py-2 opacity-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-600 truncate">{device.deviceName || 'Unknown'}</p>
                  <p className="text-xs text-gray-400">
                    Removed · Last seen {formatDate(device.lastLoginAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
