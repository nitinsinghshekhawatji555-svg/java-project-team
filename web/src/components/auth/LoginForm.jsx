'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { signIn } from '@/lib/auth'
import { Info } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  async function handleSubmit(e) {
    e.preventDefault()

    try {
      setLoading(true)
      const data = await signIn(formData)

      const role = data?.user?.user_metadata?.role || data?.session?.user?.user_metadata?.role
      if (!role) {
        toast.error('Your account is not ready yet. Please confirm your email or try again after your profile syncs.')
        router.replace('/auth/login')
        return
      }

      toast.success('Login successful')
      router.replace(`/dashboard/${role}`)
    } catch (err) {
      toast.error(err?.message || 'Unable to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
          Email Address
        </label>
        <Input
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full h-[48px] rounded-[12px] border-[#DDD0A8] bg-[#FFFBF4] text-[#1F1B10] placeholder-[#B8A880] focus:border-[#1A1609] focus:ring-[#1A1609]"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block font-mono text-[10px] font-black uppercase tracking-wider text-slate-700">
            Password
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full h-[48px] rounded-[12px] border-[#DDD0A8] bg-[#FFFBF4] text-[#1F1B10] placeholder-[#B8A880] focus:border-[#1A1609] focus:ring-[#1A1609]"
        />
      </div>
      <Button 
         type="submit" 
         className="w-full h-[50px] rounded-[12px] bg-[#1A1609] text-sm font-black uppercase tracking-wide text-white transition-all hover:bg-[#2A2211] hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50" 
        disabled={loading}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      <div className="my-4 flex items-center justify-center gap-3">
        <div className="h-[1px] flex-1 bg-slate-200"></div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">or</span>
        <div className="h-[1px] flex-1 bg-slate-200"></div>
      </div>

      <button
        type="button"
        onClick={() => toast('Coming soon, register manually.', { icon: <Info size={16} className="text-amber-600" /> })}
        className="flex w-full h-[50px] items-center justify-center rounded-[12px] border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] cursor-pointer"
      >
        <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>
    </form>
  )
}