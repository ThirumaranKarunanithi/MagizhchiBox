import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendOtp, signup as svcSignup } from '../services/authService'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()

  // step: 'form' | 'otp'
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  // Step 1 — validate and send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await sendOtp(form.email)
      setStep('otp')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — verify OTP and create account
  const handleVerifyAndSignup = async (e) => {
    e.preventDefault()
    setError('')
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return }
    setLoading(true)
    try {
      const userData = await svcSignup(form.name, form.email, form.password, otp)
      login(userData)
      navigate('/dashboard')
    } catch (err) {
      const fieldErrors = err.response?.data?.fieldErrors
      if (fieldErrors) setError(Object.values(fieldErrors).join(' '))
      else setError(err.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP with 60s cooldown
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await sendOtp(form.email)
      setOtp('')
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.')
    } finally {
      setLoading(false)
    }
  }

  const startCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const sharedCardStyle = {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.6) 100%)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    padding: 'clamp(20px, 4vw, 32px)',
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

        {/* Left Side */}
        <div className="hidden md:block w-full md:w-1/2 relative">
          <div
            className="absolute inset-0 rounded-[24px] overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]"
            style={{ border: '2px solid rgba(255, 255, 255, 0.4)' }}
          >
            <img
              src="/signup_professionals.png"
              alt="Professional"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0284C7]/90 via-[#0284C7]/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <h3 className="text-2xl sm:text-3xl font-extrabold mb-2 drop-shadow-lg">Boost Productivity</h3>
              <p className="text-base sm:text-lg font-medium text-blue-50 drop-shadow-md leading-relaxed">
                Join thousands of professionals securely managing their workload in the cloud.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-full md:w-1/2 max-w-md flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="text-center mb-3 w-full">
            <div className="flex items-center justify-center bg-white/50 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm w-full overflow-hidden h-24 sm:h-28">
              <img src="/logo.jpeg" alt="Magizhchi Box" className="w-full h-full object-cover object-center mix-blend-multiply" />
            </div>
          </div>

          {/* ── Step 1: Registration form ── */}
          {step === 'form' && (
            <div className="w-full flex flex-col justify-center" style={{...sharedCardStyle, padding: 'clamp(16px, 3vw, 24px)'}}>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 text-center">Create your account</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange}
                    className="input-field" placeholder="Thirumaran K" required autoComplete="name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange}
                    className="input-field" placeholder="you@example.com" required autoComplete="email" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" name="password" value={form.password} onChange={handleChange}
                      className="input-field" placeholder="Min 8 chars" required autoComplete="new-password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                    <input type="password" name="confirm" value={form.confirm} onChange={handleChange}
                      className="input-field" placeholder="••••••••" required autoComplete="new-password" />
                  </div>
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
                      Sending OTP…
                    </span>
                  ) : 'Send OTP'}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── Step 2: OTP verification ── */}
          {step === 'otp' && (
            <div className="w-full flex flex-col justify-center" style={{...sharedCardStyle, padding: 'clamp(16px, 3vw, 24px)'}}>
              {/* Back to form */}
              <button
                onClick={() => { setStep('form'); setError(''); setOtp('') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
                Back
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 mb-3">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Check your email</h2>
                <p className="text-sm text-gray-500 mt-1">
                  We sent a 6-digit code to<br/>
                  <span className="font-semibold text-gray-700">{form.email}</span>
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleVerifyAndSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Enter verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field text-center text-2xl font-bold tracking-[0.5em] py-3"
                    placeholder="——————"
                    required
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3 px-4 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.2)] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Creating account…
                    </span>
                  ) : 'Verify & Create Account'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Didn't receive the code?{' '}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-400">Resend in {resendCooldown}s</span>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
