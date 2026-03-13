'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldCheck, UserPlus, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
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

        // Pass minimal options, Supabase auth trigger will handle profile generation
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
            // Most setups require email confirmation, if not they auto-login
        }
    }

    if (isCheckingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <ShieldCheck className="w-6 h-6 animate-spin text-brand-400" />
                    <p>Preparing your secure workspace…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-full overflow-hidden -z-10 bg-background">
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-700/10 rounded-full blur-[120px]"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 glass-accent border border-brand-500/30 shadow-[0_0_40px_rgba(139,92,246,0.15)] rounded-3xl z-10"
            >
                <div className="flex flex-col items-center mb-10">
                    <Link href="/">
                        <Logo className="scale-90 origin-center mb-6 hover:scale-100 transition-transform" />
                    </Link>
                    <h2 className="text-2xl font-bold text-white mb-2">Create Workspace</h2>
                    <p className="text-gray-400 text-sm">Join NextLab to monitor your infrastructure</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
                        <p>{error}</p>
                    </div>
                )}

                {success ? (
                    <div className="p-8 text-center glass border border-green-500/30 rounded-2xl">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50">
                            <ShieldCheck className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Check your email</h3>
                        <p className="text-gray-400 text-sm mb-6">We sent a verification link to strictly secure your account.</p>
                        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Return to login</Link>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Professional Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                                placeholder="cto@startup.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Secure Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                                placeholder="At least 8 characters"
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3.5 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 mt-4
                ${isLoading ? 'bg-brand-800 text-brand-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-brand-500/50'}`}
                        >
                            {isLoading ? 'Encrypting...' : <><UserPlus className="w-5 h-5" /> Initialize Account</>}
                        </button>
                    </form>
                )}

                <p className="text-center text-sm text-gray-400 mt-8">
                    Already monitoring domains? <Link href="/login" className="text-brand-400 hover:text-brand-300 font-semibold transition-colors">Sign in <ArrowRight className="inline w-3 h-3 ml-1" /></Link>
                </p>
            </motion.div>
        </div>
    )
}
