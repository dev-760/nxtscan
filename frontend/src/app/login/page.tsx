'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldAlert, LogIn, ArrowRight, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isCheckingSession, setIsCheckingSession] = useState(true)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                router.replace('/dashboard')
                return
            }

            setIsCheckingSession(false)
        }

        checkSession()
    }, [router, supabase])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    if (isCheckingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-gray-400">
                    <div className="w-10 h-10 rounded-xl glass-accent flex items-center justify-center animate-pulse">
                        <Lock className="w-5 h-5 text-brand-400" />
                    </div>
                    <p className="text-sm">Verifying session…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-6">
            {/* Background dots */}
            <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Card */}
                <div className="glass rounded-3xl p-8 md:p-10 gradient-border">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-10">
                        <Link href="/" className="mb-8">
                            <Logo className="hover:scale-105 transition-transform" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Welcome back</h1>
                        <p className="text-gray-400 text-sm">Sign in to your security workspace</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm"
                        >
                            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full input-field"
                                placeholder="you@company.com"
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full input-field pr-12"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3.5 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 mt-2 text-sm
                                ${isLoading
                                    ? 'bg-brand-800/60 text-brand-300 cursor-not-allowed'
                                    : 'bg-brand-600 hover:bg-brand-500 text-white btn-premium'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-brand-300/30 border-t-brand-300 rounded-full animate-spin" />
                                    Authenticating…
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" /> Sign In
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-white/5" />
                        <span className="text-gray-600 text-xs">OR</span>
                        <div className="flex-1 h-px bg-white/5" />
                    </div>

                    <p className="text-center text-sm text-gray-400">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors inline-flex items-center gap-1">
                            Create one <ArrowRight className="w-3 h-3" />
                        </Link>
                    </p>
                </div>

                {/* Trust note */}
                <p className="text-center text-xs text-gray-600 mt-6 flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3" /> Protected by 256-bit SSL encryption
                </p>
            </motion.div>
        </div>
    )
}
