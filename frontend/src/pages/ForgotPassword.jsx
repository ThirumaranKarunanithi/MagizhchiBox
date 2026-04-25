import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { sendForgotPasswordOtp, resetPassword } from '../services/authService'

// Step indicators
const STEPS = ['Email', 'Verify Code', 'New Password']

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)          // 0 = email, 1 = otp, 2 = new password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef(null)

  // ── Step 0: send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendForgotPasswordOtp(email.trim().toLowerCase())
      setStep(1)
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not send reset code.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 1: re-send OTP ───────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError('')
    setLoading(true)
    try {
      await sendForgotPasswordOtp(email.trim().toLowerCase())
      startCooldown()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not resend code.')
    } finally {
      setLoading(false)
    }
  }

  const startCooldown = () => {
    setResendCooldown(60)
    clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current); return 0 }
        return c - 1
      })
    }, 1000)
  }

  // ── Step 1 → Step 2: just advance (no server call; OTP verified on reset) ─
  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit code sent to your email.')
      return
    }
    setError('')
    setStep(2)
  }

  // ── Step 2: reset password ────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword(email.trim().toLowerCase(), otp.trim(), password)
      navigate('/login', { state: { resetSuccess: true } })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Reset failed. Please try again.')
      // If the OTP was wrong/expired, go back to OTP step
      if (err.response?.data?.message?.toLowerCase().includes('invalid') ||
          err.response?.data?.message?.toLowerCase().includes('expired')) {
        setStep(1)
        setOtp('')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Shared UI helpers ─────────────────────────────────────────────────────
  const EyeIcon = ({ show, toggle }) => (
    <button type="button" onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
      {show ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
      )}
    </button>
  )

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden px-4"
      style={{
        backgroundColor: '#0EA5E9',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 2px, transparent 2px), linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
        backgroundSize: '24px 24px, 100% 100%',
      }}
    >
      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="flex items-center justify-center bg-white/50 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm w-full overflow-hidden h-20 mb-4">
          <img src="/logo.jpeg" alt="Magizhchi Box" className="w-full h-full object-cover object-center mix-blend-multiply" />
        </div>

        {/* Card */}
        <div
          className="w-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.6)',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            padding: 'clamp(20px, 4vw, 32px)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#0284C7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Reset your password</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 0 && "Enter your email to receive a reset code"}
              {step === 1 && `We sent a 6-digit code to ${email}`}
              {step === 2 && "Choose a strong new password"}
            </p>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i < step ? 'bg-green-500 text-white' :
                    i === step ? 'bg-[#0284C7] text-white shadow-md' :
                    'bg-gray-200 text-gray-400'}`}>
                  {i < step ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  ) : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 rounded-full transition-all ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 0: Email ─────────────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3 px-4 rounded-xl
                           shadow-lg transition-all duration-200 hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Sending code…
                  </span>
                ) : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* ── Step 1: OTP ───────────────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">6-digit reset code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="input-field text-center tracking-[0.4em] text-lg font-bold"
                  placeholder="000000"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" disabled={loading || otp.length !== 6}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3 px-4 rounded-xl
                           shadow-lg transition-all duration-200 hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                Verify Code
              </button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => { setStep(0); setOtp(''); setError('') }}
                  className="text-gray-500 hover:text-gray-700 transition-colors">
                  ← Change email
                </button>
                <button type="button" onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[#0284C7] hover:text-[#0369A1] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 2: New Password ──────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    autoFocus
                    autoComplete="new-password"
                  />
                  <EyeIcon show={showPassword} toggle={() => setShowPassword((v) => !v)} />
                </div>
                {/* Password strength bar */}
                {password.length > 0 && (
                  <div className="mt-1.5">
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          password.length < 8 ? 'w-1/4 bg-red-400' :
                          password.length < 12 ? 'w-1/2 bg-yellow-400' :
                          'w-full bg-green-500'
                        }`}
                      />
                    </div>
                    <p className={`text-xs mt-0.5 ${
                      password.length < 8 ? 'text-red-500' :
                      password.length < 12 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {password.length < 8 ? 'Too short' :
                       password.length < 12 ? 'Good' : 'Strong'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={`input-field pr-10 ${
                      confirm.length > 0
                        ? password === confirm ? 'border-green-400 focus:ring-green-400' : 'border-red-400 focus:ring-red-400'
                        : ''
                    }`}
                    placeholder="Re-enter password"
                    required
                    autoComplete="new-password"
                  />
                  <EyeIcon show={showConfirm} toggle={() => setShowConfirm((v) => !v)} />
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-red-500 mt-0.5">Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={loading || password.length < 8 || password !== confirm}
                className="w-full bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold py-3 px-4 rounded-xl
                           shadow-lg transition-all duration-200 hover:-translate-y-0.5
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Resetting…
                  </span>
                ) : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Back to login */}
          <p className="mt-5 text-center text-sm text-gray-500">
            Remember your password?{' '}
            <Link to="/login" className="text-[#0284C7] hover:text-[#0369A1] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
