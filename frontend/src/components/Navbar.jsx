import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setMenuOpen(false)
  }

  // Close menu when tapping outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

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
    <nav className="bg-white sm:bg-white/40 backdrop-blur-xl border-b border-white/40 sticky top-0 z-20 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-16">

          {/* Logo */}
          <div className="flex items-center bg-white rounded-xl p-1.5 sm:shadow-sm sm:border sm:border-white">
            <img src="/logo.jpeg" alt="Magizhchi Box" className="h-14 sm:h-12 w-auto object-contain" />
          </div>

          {/* Desktop tabs (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-1">
            {['files', 'devices'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white shadow-md text-[#0284C7]'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                }`}
              >
                {tab === 'files' ? 'My Files' : 'Devices'}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Desktop: storage + avatar + sign out */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
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
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#0EA5E9] shadow-sm flex items-center justify-center text-white text-sm font-bold border border-white/80">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Mobile: hamburger menu */}
            <div className="sm:hidden relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/60 border border-white/60 shadow-sm active:bg-white/80 transition-all"
                aria-label="Menu"
              >
                <span className={`block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div className="absolute right-0 top-12 w-64 rounded-2xl overflow-hidden shadow-2xl border border-white/60 z-50"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.92) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#0EA5E9] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                  </div>

                  {/* Navigation items */}
                  <div className="py-1">
                    <button
                      onClick={() => handleTabChange('files')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors min-h-[48px]
                        ${activeTab === 'files' ? 'text-[#0284C7] bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                        ${activeTab === 'files' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <svg className={`w-4 h-4 ${activeTab === 'files' ? 'text-[#0284C7]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                        </svg>
                      </div>
                      My Files
                      {activeTab === 'files' && (
                        <svg className="w-4 h-4 ml-auto text-[#0284C7]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => handleTabChange('devices')}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors min-h-[48px]
                        ${activeTab === 'devices' ? 'text-[#0284C7] bg-blue-50' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
                        ${activeTab === 'devices' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <svg className={`w-4 h-4 ${activeTab === 'devices' ? 'text-[#0284C7]' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      Devices
                      {activeTab === 'devices' && (
                        <svg className="w-4 h-4 ml-auto text-[#0284C7]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Storage section */}
                  <div className="px-4 py-3 border-t border-gray-100 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/>
                      </svg>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Storage</span>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-600 font-medium">
                        {fmt(user?.storageUsedBytes)} used
                      </span>
                      <span className={`text-xs font-bold ${usedPct > 85 ? 'text-red-500' : 'text-gray-500'}`}>
                        {usedPct}% of {fmt(user?.storageQuotaBytes)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${usedPct > 85 ? 'bg-red-500' : 'bg-gradient-to-r from-[#0EA5E9] to-[#0284C7]'}`}
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors min-h-[48px]"
                    >
                      <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                      </div>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </nav>
  )
}
