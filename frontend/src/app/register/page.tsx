'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldCheck, UserPlus, ArrowRight, Lock, Eye, EyeOff, CheckCircle2, Mail } from 'lucide-react'

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
    const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500']
    const strengthTextColors = ['', 'text-red-400', 'text-amber-400', 'text-emerald-400']

    if (isCheckingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-gray-400">
                    <div className="w-10 h-10 rounded-xl glass-accent flex items-center justify-center animate-pulse">
                        <ShieldCheck className="w-5 h-5 text-brand-400" />
                    </div>
                    <p className="text-sm">Preparing workspace…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden px-6">
            {/* Background pattern */}
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
                        <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Create your account</h1>
                        <p className="text-gray-400 text-sm">Start monitoring your infrastructure today</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-red-500/8 border border-red-500/20 flex items-start gap-3 text-red-400 text-sm"
                        >
                            <p>{error}</p>
                        </motion.div>
                    )}

                    {/* Success State */}
                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-4"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
                                <Mail className="w-7 h-7 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                We've sent a verification link to{' '}
                                <span className="text-white font-medium">{email}</span>
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
                        <>
                            {/* Form */}
                            <form onSubmit={handleRegister} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                                        Work Email
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
                                            placeholder="Minimum 8 characters"
                                            minLength={8}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Password strength bar */}
                                    {password.length > 0 && (
                                        <div className="mt-3 flex items-center gap-3">
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
                                        </div>
                                    )}
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
                                    <div key={i} className="flex items-center gap-2.5 text-xs text-gray-500">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                                        {text}
                                    </div>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 my-6">
                                <div className="flex-1 h-px bg-white/5" />
                                <span className="text-gray-600 text-xs">OR</span>
                                <div className="flex-1 h-px bg-white/5" />
                            </div>

                            <p className="text-center text-sm text-gray-400">
                                Already have an account?{' '}
                                <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors inline-flex items-center gap-1">
                                    Sign in <ArrowRight className="w-3 h-3" />
                                </Link>
                            </p>
                        </>
                    )}
                </div>

                {/* Trust note */}
                <p className="text-center text-xs text-gray-600 mt-6 flex items-center justify-center gap-1.5">
                    <Lock className="w-3 h-3" /> Your data is encrypted at rest and in transit
                </p>
            </motion.div>
        </div>
    )
}
