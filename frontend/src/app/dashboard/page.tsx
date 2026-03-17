'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Activity, AlertTriangle, CheckCircle, Globe, Play, Shield, Trash2, X, ShieldCheck, Zap, Lock, Server, Bell, BarChart3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerProScan } from '@/lib/api'
import { normalizeDomain } from '@/lib/domain'

export default function Dashboard() {
    interface Domain {
        id: string
        domain: string
        created_at: string
    }

    const [domains, setDomains] = useState<Domain[]>([])
    const [newDomain, setNewDomain] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [scanningDomain, setScanningDomain] = useState<string | null>(null)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [plan, setPlan] = useState<'free' | 'pro' | 'agency' | null>(null)
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error'
        message: string
    } | null>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const ensureSessionAndLoad = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.replace('/login')
                return
            }

            const { data: profile } = await supabase
                .from('users')
                .select('plan')
                .eq('id', user.id)
                .single()

            if (profile?.plan) {
                setPlan(profile.plan)
            }

            await fetchDomains()
            setIsAuthLoading(false)
        }

        ensureSessionAndLoad()
    }, [router, supabase])

    /* Auto-dismiss feedback after 5s */
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [feedback])

    const fetchDomains = async () => {
        const { data, error } = await supabase.from('domains').select('*').order('created_at', { ascending: false })
        if (data && !error) setDomains(data)
    }

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newDomain) return
        setFeedback(null)
        setIsLoading(true)

        const cleanedDomain = normalizeDomain(newDomain)

        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { error } = await supabase.from('domains').insert([
                { user_id: user.id, domain: cleanedDomain }
            ])

            if (!error) {
                setNewDomain('')
                setFeedback({
                    type: 'success',
                    message: `Domain ${cleanedDomain} successfully secured for monitoring.`,
                })
                fetchDomains()
            } else {
                setFeedback({
                    type: 'error',
                    message: 'Failed to add domain. It may already be monitored.',
                })
            }
        }
        setIsLoading(false)
    }

    const handleDeleteDomain = async (domainId: string) => {
        const { error } = await supabase.from('domains').delete().eq('id', domainId)
        if (!error) {
            setFeedback({ type: 'success', message: 'Domain removed from monitoring.' })
            fetchDomains()
        }
    }

    const handleTriggerScan = async (domainId: string, domainStr: string) => {
        setFeedback(null)
        setScanningDomain(domainStr)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            await triggerProScan(domainStr, domainId, session.access_token)
            setFeedback({
                type: 'success',
                message: `Automated intelligence scan queued for ${domainStr}.`,
            })
        } catch (err) {
            console.error('Scan trigger failed:', err)
            setFeedback({
                type: 'error',
                message: 'Scan request failed. Please try again in a moment.',
            })
        }
        setScanningDomain(null)
    }

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-secondary">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-brand-500/20 border-t-brand-400 rounded-full animate-spin"></div>
                        <Lock className="w-4 h-4 text-brand-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm font-medium tracking-wide">Establishing Secure Connection…</p>
                </div>
            </div>
        )
    }

    const humanPlan =
        plan === 'pro' ? 'Professional' : plan === 'agency' ? 'Enterprise' : 'Free'

    return (
        <div className="relative min-h-[90vh] py-8 md:py-12">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-grid-pattern opacity-30 z-0 pointer-events-none"></div>
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-500/10 blur-[150px] rounded-full pointer-events-none z-0"></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 md:mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="max-w-2xl"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-accent border border-brand-500/20 text-brand-300 text-xs font-semibold mb-6 shadow-[0_0_20px_rgba(124,92,231,0.15)]">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Enterprise Security Active</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-brand-300 mb-4 tracking-tight">
                            Command Center
                        </h1>
                        <p className="text-secondary text-base md:text-lg leading-relaxed">
                            Monitor and protect your infrastructure with continuous AI-driven threat intelligence.
                        </p>
                    </motion.div>

                    {/* Plan pill / call to action */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="w-full md:w-auto"
                    >
                        <div className="inline-flex items-center gap-3 rounded-2xl bg-slate-900/70 border border-white/10 px-4 py-3 backdrop-blur-xl shadow-lg w-full md:w-auto justify-between md:justify-start">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex h-6 items-center rounded-full bg-emerald-500/15 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                                    Plan
                                </span>
                                <span className="text-sm font-semibold text-primary">
                                    {humanPlan}
                                </span>
                            </div>
                            {plan !== 'agency' && (
                                <button
                                    onClick={() => router.push('/#pricing')}
                                    className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-200 hover:bg-brand-500/25 transition-colors"
                                >
                                    <Zap className="w-3 h-3" />
                                    Upgrade for more scans
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Performance Stats Row */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
                >
                    <div className="glass-surface p-6 rounded-3xl border border-white/[0.06] relative overflow-hidden group hover:border-brand-500/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-[50px] rounded-full group-hover:bg-brand-500/20 transition-all"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 text-brand-400">
                                <Server className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-4xl font-black text-primary mb-1 relative z-10 tracking-tight">{domains.length}</h3>
                        <p className="text-secondary text-sm font-medium relative z-10 uppercase tracking-widest">Active Perimeters</p>
                    </div>

                    <div className="glass-surface p-6 rounded-3xl border border-white/[0.06] relative overflow-hidden group hover:border-success/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 blur-[50px] rounded-full group-hover:bg-success/20 transition-all"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="p-3 bg-success/10 rounded-2xl border border-success/20 text-success">
                                <Shield className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-4xl font-black text-primary mb-1 relative z-10 tracking-tight">Secure</h3>
                        <p className="text-secondary text-sm font-medium relative z-10 uppercase tracking-widest">Overall Posture</p>
                    </div>

                    <div className="glass-surface p-6 rounded-3xl border border-white/[0.06] relative overflow-hidden group hover:border-warning/30 transition-colors">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 blur-[50px] rounded-full group-hover:bg-warning/20 transition-all"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="p-3 bg-warning/10 rounded-2xl border border-warning/20 text-warning">
                                <Zap className="w-6 h-6" />
                            </div>
                        </div>
                        <h3 className="text-4xl font-black text-primary mb-1 relative z-10 tracking-tight">Continuous</h3>
                        <p className="text-secondary text-sm font-medium relative z-10 uppercase tracking-widest">Monitoring Mode</p>
                    </div>
                </motion.div>

                {/* Usage & alerts row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.18 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10"
                >
                    <div className="glass p-5 rounded-3xl border border-white/[0.08] flex items-start gap-4">
                        <div className="p-2.5 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-300">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary mb-1.5">
                                Usage vs plan
                            </p>
                            <p className="text-sm text-primary mb-1">
                                {domains.length} / ∞ monitored domains
                            </p>
                            <p className="text-xs text-secondary">
                                {plan === 'free'
                                    ? 'You are on the Free plan — add a few key domains to establish coverage.'
                                    : plan === 'pro'
                                        ? 'Professional plan — automated weekly scans are active for all monitored domains.'
                                        : 'Enterprise plan — unlimited domains with advanced reporting and API access.'}
                            </p>
                        </div>
                    </div>
                    <div className="glass p-5 rounded-3xl border border-white/[0.08] flex items-start gap-4 lg:col-span-2">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary mb-1.5">
                                Alerts & reporting
                            </p>
                            <p className="text-sm text-primary mb-1">
                                Centralize findings into scheduled PDF reports for leadership.
                            </p>
                            <p className="text-xs text-secondary">
                                Weekly summaries and breach alerts are available on paid plans. Connect your domains now to
                                start building an executive-friendly history of your external posture.
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* Add Domain Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="glass p-6 md:p-8 rounded-3xl border border-white/[0.08] mb-10 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 via-brand-600 to-brand-400"></div>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full text-center md:text-left">
                            <h2 className="text-2xl font-bold text-primary mb-2">Deploy New Sensor</h2>
                            <p className="text-secondary text-sm">Enter a domain/IP to begin continuous threat intelligence and vulnerability mapping.</p>
                        </div>
                        <form onSubmit={handleAddDomain} className="flex gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-80">
                                <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-tertiary" />
                                <input
                                    type="text"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="target.com or 192.168.1.1"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all text-sm font-mono"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !newDomain.trim()}
                                className="bg-brand-500 hover:bg-brand-400 disabled:bg-brand-900/40 disabled:text-brand-300 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3.5 font-bold transition-all flex items-center gap-2 btn-premium flex-shrink-0 shadow-[0_0_20px_rgba(124,92,231,0.3)] hover:shadow-[0_0_30px_rgba(124,92,231,0.5)]"
                            >
                                {isLoading ? (
                                    <Activity className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Plus className="w-5 h-5" />
                                )}
                                Add Perimeter
                            </button>
                        </form>
                    </div>
                </motion.div>

                {/* Feedback toast */}
                <div className="relative">
                    <AnimatePresence>
                        {feedback && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                className={`absolute -top-6 left-0 right-0 z-50 mx-auto max-w-2xl rounded-2xl border px-5 py-4 flex items-center gap-4 shadow-2xl backdrop-blur-xl ${
                                    feedback.type === 'success'
                                        ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-300'
                                        : 'border-red-500/30 bg-red-950/80 text-red-300'
                                }`}
                            >
                                <div className={`p-2 rounded-full ${feedback.type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                    {feedback.type === 'success' ? (
                                        <CheckCircle className="w-5 h-5" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5" />
                                    )}
                                </div>
                                <p className="flex-1 font-medium text-sm">{feedback.message}</p>
                                <button
                                    onClick={() => setFeedback(null)}
                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Domains List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    {domains.length === 0 ? (
                        <div className="text-center py-24 glass-strong rounded-3xl border border-dashed border-white/[0.08] relative overflow-hidden">
                            <div className="absolute inset-0 bg-brand-500/5 mesh-gradient"></div>
                            <div className="relative z-10">
                                <div className="w-20 h-20 rounded-full glass-accent flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(124,92,231,0.2)]">
                                    <Globe className="w-10 h-10 text-brand-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-primary mb-3">No infrastructure mapped</h3>
                                <p className="text-secondary max-w-md mx-auto mb-8">Deploy your first sensor above to begin intelligent mapping and continuous security monitoring.</p>
                                <div className="inline-flex items-center gap-2 text-xs text-brand-300 bg-brand-500/10 px-5 py-2.5 rounded-full border border-brand-500/20 font-medium">
                                    <Shield className="w-4 h-4" />
                                    Your domains are scanned weekly with 15+ complex security checks
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <AnimatePresence>
                                {domains.map((d, i) => (
                                    <motion.div
                                        key={d.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="glass p-6 rounded-3xl border border-white/[0.06] hover:border-brand-500/40 transition-all duration-300 card-hover flex flex-col group relative overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-[40px] rounded-full group-hover:bg-brand-500/15 transition-all duration-500"></div>

                                        {/* Delete button */}
                                        <button
                                            onClick={() => handleDeleteDomain(d.id)}
                                            className="absolute top-6 right-6 p-2 rounded-xl text-tertiary hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-500/20 z-10"
                                            aria-label={`Remove ${d.domain}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-gradient-to-br from-brand-500/20 to-brand-500/5 p-3 rounded-2xl border border-brand-500/20 shadow-[0_0_15px_rgba(124,92,231,0.1)]">
                                                <Globe className="w-5 h-5 text-brand-300" />
                                            </div>
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                Active
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-white font-mono break-all leading-tight mb-2 pr-12 group-hover:text-brand-300 transition-colors">{d.domain}</h3>
                                        <div className="flex items-center gap-2 text-tertiary text-xs mb-8">
                                            <Activity className="w-3.5 h-3.5" />
                                            Added: {new Date(d.created_at).toLocaleDateString()}
                                        </div>

                                        <div className="mt-auto relative z-10">
                                            <button
                                                onClick={() => handleTriggerScan(d.id, d.domain)}
                                                disabled={scanningDomain === d.domain}
                                                className="w-full glass-surface hover:bg-brand-500/10 border border-white/[0.06] hover:border-brand-500/30 text-primary py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 flex justify-center items-center gap-2 disabled:cursor-not-allowed group/btn hover:shadow-[0_0_20px_rgba(124,92,231,0.15)] overflow-hidden relative"
                                            >
                                                {scanningDomain === d.domain && (
                                                    <div className="absolute inset-0 scan-shimmer opacity-20 pointer-events-none"></div>
                                                )}
                                                {scanningDomain === d.domain ? (
                                                    <Activity className="w-4 h-4 animate-spin text-brand-400 relative z-10" />
                                                ) : (
                                                    <Play className="w-4 h-4 text-brand-400 group-hover/btn:text-brand-300 relative z-10 transition-colors" />
                                                )}
                                                <span className="relative z-10">{scanningDomain === d.domain ? 'Dispatching Probes...' : 'Force Manual Scan'}</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    )
}
