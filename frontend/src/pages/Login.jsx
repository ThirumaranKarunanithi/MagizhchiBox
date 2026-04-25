import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login as svcLogin } from '../services/authService'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const userData = await svcLogin(form.email, form.password)
      login(userData)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundColor: '#0EA5E9',
        backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.2) 2px, transparent 2px), linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
        backgroundSize: '24px 24px, 100% 100%',
      }}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row relative z-10 items-center md:items-stretch justify-center p-4 md:p-6 gap-6 lg:gap-12">
        
        {/* Left Side: Form */}
        <div className="w-full md:w-1/2 max-w-md flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center bg-white/50 backdrop-blur-sm border border-white/80 rounded-[1rem] p-3 shadow-sm mb-3">
              <img src="/logo.jpeg" alt="Magizhchi Box" className="h-10 sm:h-12 w-auto object-contain mix-blend-multiply" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 drop-shadow-md">Magizhchi Box</h1>
            <p className="text-blue-50 font-medium text-xs sm:text-sm">Secure Cloud Storage, Simplified</p>
          </div>

          <div 
            className="w-full"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              padding: 'clamp(20px, 4vw, 32px)',
            }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 text-center">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full mt-4 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3 px-4 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
              Create one
            </Link>
          </p>
        </div>
        </div>
        
        {/* Right Side: Professional Image */}
        <div className="hidden md:block w-full md:w-1/2 relative">
          <div 
            className="absolute inset-0 rounded-[24px] overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
            style={{ border: '2px solid rgba(255, 255, 255, 0.4)' }}
          >
            <img 
              src="/login_professionals.png" 
              alt="Professionals Collaborating" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0284C7]/90 via-[#0284C7]/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <h3 className="text-2xl sm:text-3xl font-extrabold mb-2 drop-shadow-lg">Secure Collaboration</h3>
              <p className="text-base sm:text-lg font-medium text-blue-50 drop-shadow-md leading-relaxed">
                Empowering your team with seamless and secure access to critical data from anywhere.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
