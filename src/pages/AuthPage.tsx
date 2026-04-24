import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { authLogin, authRegister } from "@/lib/api"

type Tab = "signin" | "signup"

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("signin")
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Sign-in state
  const [siEmail, setSiEmail] = useState("")
  const [siPassword, setSiPassword] = useState("")
  const [siShowPw, setSiShowPw] = useState(false)
  const [siError, setSiError] = useState("")
  const [siLoading, setSiLoading] = useState(false)

  // Sign-up state
  const [suName, setSuName] = useState("")
  const [suEmail, setSuEmail] = useState("")
  const [suPassword, setSuPassword] = useState("")
  const [suConfirm, setSuConfirm] = useState("")
  const [suShowPw, setSuShowPw] = useState(false)
  const [suError, setSuError] = useState("")
  const [suLoading, setSuLoading] = useState(false)
  const [suSuccess, setSuSuccess] = useState(false)

  const verified = searchParams.get("verified") === "1"

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) navigate("/", { replace: true })
  }, [navigate])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setSiError("")
    setSiLoading(true)
    try {
      const { access_token } = await authLogin(siEmail, siPassword)
      localStorage.setItem("auth_token", access_token)
      navigate("/", { replace: true })
    } catch (err: unknown) {
      setSiError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setSiLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setSuError("")
    if (suPassword.length < 8) {
      setSuError("Password must be at least 8 characters")
      return
    }
    if (suPassword !== suConfirm) {
      setSuError("Passwords do not match")
      return
    }
    setSuLoading(true)
    try {
      await authRegister(suName, suEmail, suPassword)
      setSuSuccess(true)
    } catch (err: unknown) {
      setSuError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSuLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/30 via-black to-black pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sutradhar</h1>
          <p className="text-xs text-sky-500/80 mt-1 tracking-widest uppercase font-semibold">The Third Eye</p>
        </div>

        {/* Card */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Verified banner */}
          {verified && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center gap-2 text-emerald-400 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Email verified! You can now sign in.
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? "text-sky-400 border-b-2 border-sky-500 bg-sky-500/5"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "signin" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── Sign In ── */}
            {tab === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={siShowPw ? "text" : "password"}
                      required
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setSiShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      <EyeIcon open={siShowPw} />
                    </button>
                  </div>
                </div>

                {siError && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {siError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={siLoading}
                  className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {siLoading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            )}

            {/* ── Sign Up ── */}
            {tab === "signup" && (
              suSuccess ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/20 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth={1.5} className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">Check your inbox</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    We sent a verification link to<br />
                    <span className="text-sky-400">{suEmail}</span>.
                  </p>
                  <p className="text-gray-600 text-xs mt-3">Click the link in the email to activate your account.</p>
                  <button
                    onClick={() => setTab("signin")}
                    className="mt-6 text-sky-400 hover:text-sky-300 text-sm font-medium transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={suName}
                      onChange={(e) => setSuName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                    <input
                      type="email"
                      required
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
                    <div className="relative">
                      <input
                        type={suShowPw ? "text" : "password"}
                        required
                        value={suPassword}
                        onChange={(e) => setSuPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setSuShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        <EyeIcon open={suShowPw} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
                    <input
                      type={suShowPw ? "text" : "password"}
                      required
                      value={suConfirm}
                      onChange={(e) => setSuConfirm(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
                    />
                  </div>

                  {suError && (
                    <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {suError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={suLoading}
                    className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {suLoading ? "Creating account…" : "Create Account"}
                  </button>
                </form>
              )
            )}
          </div>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          {tab === "signin"
            ? <>No account? <button onClick={() => setTab("signup")} className="text-sky-500 hover:text-sky-400">Create one</button></>
            : <>Already have an account? <button onClick={() => setTab("signin")} className="text-sky-500 hover:text-sky-400">Sign in</button></>
          }
        </p>
      </div>
    </div>
  )
}
