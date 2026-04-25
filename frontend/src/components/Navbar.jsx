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
    <nav className="bg-white/80 backdrop-blur-md border-b border-white/40 sticky top-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/logo.jpeg" alt="Magizhchi Box" className="h-10 w-auto object-contain" />
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:flex items-center gap-1">
            {['files', 'devices'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white shadow-sm border border-white/80 text-[#0284C7]'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                {tab === 'files' ? 'My Files' : 'Devices'}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Storage indicator — desktop only (mobile has it below) */}
            <div className="hidden md:block text-right">
              <p className="text-xs text-gray-500">
                {fmt(user?.storageUsedBytes)} / {fmt(user?.storageQuotaBytes)}
              </p>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className={`h-full rounded-full transition-all shadow-sm ${usedPct > 85 ? 'bg-red-500' : 'bg-gradient-to-r from-[#0EA5E9] to-[#0284C7]'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>

            {/* Avatar + logout */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] shadow-sm flex items-center justify-center text-white text-sm font-semibold border border-white/50">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="hidden sm:block text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile bottom row: tabs + compact storage + sign out */}
        <div className="sm:hidden pb-2 space-y-2">
          {/* Tabs */}
          <div className="flex gap-2">
            {['files', 'devices'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize transition-all min-h-[40px] ${
                  activeTab === tab
                    ? 'bg-white shadow-sm border border-white/80 text-[#0284C7]'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                {tab === 'files' ? 'My Files' : 'Devices'}
              </button>
            ))}
          </div>

          {/* Storage bar + sign out side by side */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">
                  {fmt(user?.storageUsedBytes)} / {fmt(user?.storageQuotaBytes)}
                </span>
                <span className={`text-xs font-medium ${usedPct > 85 ? 'text-red-500' : 'text-gray-400'}`}>
                  {usedPct}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${usedPct > 85 ? 'bg-red-500' : 'bg-gradient-to-r from-[#0EA5E9] to-[#0284C7]'}`}
                  style={{ width: `${usedPct}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 font-medium px-3 py-1.5 rounded-lg bg-white/60 border border-white/60 min-h-[32px] flex-shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
