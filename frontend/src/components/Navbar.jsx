import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const usedPct = user
    ? Math.min(100, Math.round((user.storageUsedBytes / user.storageQuotaBytes) * 100))
    : 0

  const fmt = (bytes) => {
    if (!bytes) return '0 B'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/logo.jpeg" alt="Magizhchi Box" className="h-10 w-auto object-contain" />
          </div>

          {/* Tabs */}
          <div className="hidden sm:flex items-center gap-1">
            {['files', 'devices'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab === 'files' ? 'My Files' : 'Devices'}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Storage indicator */}
            <div className="hidden md:block text-right">
              <p className="text-xs text-gray-500">
                {fmt(user?.storageUsedBytes)} / {fmt(user?.storageQuotaBytes)}
              </p>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className={`h-full rounded-full transition-all ${usedPct > 85 ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            {/* Avatar + logout */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden flex gap-2 pb-2">
          {['files', 'devices'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium capitalize ${
                activeTab === tab
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab === 'files' ? 'My Files' : 'Devices'}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
