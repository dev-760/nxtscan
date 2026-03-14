'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldAlert, LogIn, ArrowRight, ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react'

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
                <div className="flex flex-col items-center gap-4 text-secondary">
                    <div className="w-12 h-12 rounded-xl glass-accent flex items-center justify-center animate-glow-pulse">
                        <Lock className="w-5 h-5 text-brand-400" />
                    </div>
                    <p className="text-sm font-medium">Verifying session…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-6">
            {/* Background layers */}
            <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

            {/* Ambient purple orb */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-brand-500/[0.06] rounded-full blur-[150px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[420px] relative z-10"
            >
                {/* Back to home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-tertiary hover:text-secondary transition-colors text-sm mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to home
                </Link>

                {/* Card */}
                <div className="glass-strong rounded-3xl p-8 md:p-10 gradient-border">
                    {/* Header */}
                    <div className="flex flex-col items-center mb-10">
                        <Link href="/" className="mb-8">
                            <Logo className="hover:scale-105 transition-transform" />
                        </Link>
                        <h1 className="text-2xl font-bold text-primary mb-1.5 tracking-tight">Welcome back</h1>
                        <p className="text-secondary text-sm">Sign in to your security workspace</p>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                className="mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/20 flex items-start gap-3 text-error text-sm"
                            >
                                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <p className="flex-1">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-tertiary hover:text-error transition-colors p-0.5"
                                    aria-label="Dismiss error"
                                >
                                    <span className="text-xs">✕</span>
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label htmlFor="login-email" className="block text-xs font-semibold text-secondary mb-2 uppercase tracking-wider">
                                Email Address
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full input-field"
                                placeholder="you@company.com"
                                autoComplete="email"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label htmlFor="login-password" className="block text-xs font-semibold text-secondary mb-2 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="login-password"
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
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition-colors"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                                    : 'bg-brand-500 hover:bg-brand-400 text-white btn-premium'
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
                        <span className="text-tertiary text-xs">OR</span>
                        <div className="flex-1 h-px bg-white/5" />
                    </div>

                    <p className="text-center text-sm text-secondary">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors inline-flex items-center gap-1">
                            Create one <ArrowRight className="w-3 h-3" />
                        </Link>
                    </p>
                </div>

                {/* Trust note */}
                <p className="text-center text-xs text-tertiary mt-6 flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3" /> Protected by 256-bit SSL encryption
                </p>
            </motion.div>
        </div>
    )
}
