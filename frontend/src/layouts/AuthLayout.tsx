import { Outlet, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function AuthLayout() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_28%),linear-gradient(135deg,#020617_0%,#081028_45%,#0f172a_100%)]" />
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[-8rem] top-12 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute right-[-6rem] top-1/3 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/70 backdrop-blur-xl transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-lg">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
