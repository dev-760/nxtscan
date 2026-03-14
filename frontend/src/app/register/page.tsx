'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, UserPlus, ArrowRight, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(false)

        const { error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            setSuccess(true)
            setIsLoading(false)
        }
    }

    // Password strength indicator
    const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3
    const strengthLabels = ['', 'Weak', 'Fair', 'Strong']
    const strengthColors = ['', 'bg-error', 'bg-warning', 'bg-success']
    const strengthTextColors = ['', 'text-error', 'text-warning', 'text-success']

    if (isCheckingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-secondary">
                    <div className="w-12 h-12 rounded-xl glass-accent flex items-center justify-center animate-glow-pulse">
                        <ShieldCheck className="w-5 h-5 text-brand-400" />
                    </div>
                    <p className="text-sm font-medium">Preparing workspace…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-6 py-12">
            {/* Background layers */}
            <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-grid-pattern opacity-25 pointer-events-none" />

            {/* Ambient purple orb */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-500/[0.06] rounded-full blur-[150px] pointer-events-none" />

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
                        <h1 className="text-2xl font-bold text-primary mb-1.5 tracking-tight">Create your account</h1>
                        <p className="text-secondary text-sm">Start monitoring your infrastructure today</p>
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

                    {/* Success State */}
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="text-center py-4"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 animate-glow-pulse">
                                    <Mail className="w-7 h-7 text-success" />
                                </div>
                                <h3 className="text-xl font-bold text-primary mb-2">Check your email</h3>
                                <p className="text-secondary text-sm mb-6 leading-relaxed">
                                    We&apos;ve sent a verification link to{' '}
                                    <span className="text-primary font-medium">{email}</span>
                                    <br />to secure your account.
                                </p>
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-semibold transition-colors text-sm"
                                >
                                    Return to login <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </motion.div>
                        ) : (
                            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {/* Form */}
                                <form onSubmit={handleRegister} className="space-y-5">
                                    <div>
                                        <label htmlFor="reg-email" className="block text-xs font-semibold text-secondary mb-2 uppercase tracking-wider">
                                            Work Email
                                        </label>
                                        <input
                                            id="reg-email"
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
                                        <label htmlFor="reg-password" className="block text-xs font-semibold text-secondary mb-2 uppercase tracking-wider">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="reg-password"
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full input-field pr-12"
                                                placeholder="Minimum 8 characters"
                                                minLength={8}
                                                autoComplete="new-password"
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

                                        {/* Password strength bar */}
                                        <AnimatePresence>
                                            {password.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-3 flex items-center gap-3"
                                                >
                                                    <div className="flex-1 flex gap-1.5">
                                                        {[1, 2, 3].map((level) => (
                                                            <div
                                                                key={level}
                                                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                                                    passwordStrength >= level
                                                                        ? strengthColors[passwordStrength]
                                                                        : 'bg-white/5'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className={`text-xs font-medium ${strengthTextColors[passwordStrength]}`}>
                                                        {strengthLabels[passwordStrength]}
                                                    </span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
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
                                                Creating account…
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-4 h-4" /> Create Account
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Benefits */}
                                <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                                    {['Unlimited free scans', 'No credit card required', 'Cancel anytime'].map((text, i) => (
                                        <div key={i} className="flex items-center gap-2.5 text-xs text-tertiary">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-500/40 flex-shrink-0" />
                                            {text}
                                        </div>
                                    ))}
                                </div>

                                {/* Divider */}
                                <div className="flex items-center gap-4 my-6">
                                    <div className="flex-1 h-px bg-white/5" />
                                    <span className="text-tertiary text-xs">OR</span>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>

                                <p className="text-center text-sm text-secondary">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors inline-flex items-center gap-1">
                                        Sign in <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Trust note */}
                <p className="text-center text-xs text-tertiary mt-6 flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3" /> Your data is encrypted at rest and in transit
                </p>
            </motion.div>
        </div>
    )
}
