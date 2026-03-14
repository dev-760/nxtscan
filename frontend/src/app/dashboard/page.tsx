'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Activity, AlertTriangle, CheckCircle, Globe, Play, Shield, Trash2, X } from 'lucide-react'
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
                    message: `Domain ${cleanedDomain} added for monitoring.`,
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
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-secondary">
                    <Activity className="w-6 h-6 animate-spin text-brand-400" />
                    <p className="text-sm font-medium">Securing your workspace…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col pt-4 md:pt-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-primary mb-2 tracking-tight">Monitored Perimeters</h1>
                    <p className="text-secondary text-sm md:text-base">
                        View and protect your active domains.
                        {domains.length > 0 && (
                            <span className="text-tertiary ml-2">({domains.length} domain{domains.length !== 1 ? 's' : ''})</span>
                        )}
                    </p>
                </div>

                <form onSubmit={handleAddDomain} className="flex gap-2 w-full sm:w-auto">
                    <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="target.com"
                        className="input-field flex-1 sm:max-w-[200px]"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !newDomain.trim()}
                        className="bg-brand-500 hover:bg-brand-400 disabled:bg-brand-900/40 disabled:text-brand-300 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2.5 font-bold transition-all flex items-center gap-2 btn-premium flex-shrink-0"
                    >
                        {isLoading ? (
                            <Activity className="w-5 h-5 animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5" />
                        )}
                        Add
                    </button>
                </form>
            </div>

            {/* Feedback toast */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`mb-8 rounded-2xl border px-4 py-3 flex items-center gap-3 text-sm ${
                            feedback.type === 'success'
                                ? 'border-emerald-500/30 bg-emerald-500/8 text-success'
                                : 'border-red-500/30 bg-red-500/8 text-error'
                        }`}
                    >
                        {feedback.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        )}
                        <p className="flex-1">{feedback.message}</p>
                        <button
                            onClick={() => setFeedback(null)}
                            className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                            aria-label="Dismiss"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {domains.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20 glass-strong rounded-3xl border border-dashed border-white/[0.06]"
                >
                    <div className="w-16 h-16 rounded-2xl glass-accent flex items-center justify-center mx-auto mb-5">
                        <Globe className="w-8 h-8 text-brand-500/40" />
                    </div>
                    <h3 className="text-2xl font-bold text-primary mb-2">No infrastructure mapped</h3>
                    <p className="text-secondary max-w-md mx-auto mb-6">Add your first domain above to schedule automated intelligence checks.</p>
                    <div className="inline-flex items-center gap-2 text-xs text-tertiary bg-white/[0.02] px-4 py-2 rounded-full">
                        <Shield className="w-3.5 h-3.5" />
                        Your domains are scanned weekly with 15+ security checks
                    </div>
                </motion.div>
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
                                className="glass p-6 rounded-2xl border border-white/[0.06] hover:border-brand-500/25 transition-all card-hover flex flex-col group relative"
                            >
                                {/* Delete button */}
                                <button
                                    onClick={() => handleDeleteDomain(d.id)}
                                    className="absolute top-4 right-4 p-1.5 rounded-lg text-tertiary hover:text-error hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    aria-label={`Remove ${d.domain}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-brand-500/10 p-2.5 rounded-xl border border-brand-500/20">
                                        <Globe className="w-6 h-6 text-brand-400" />
                                    </div>
                                    <span className="badge-pass text-xs font-bold px-2.5 py-1 rounded-lg">Monitoring</span>
                                </div>

                                <h3 className="text-xl font-bold text-primary font-mono break-all leading-tight mb-2 pr-8">{d.domain}</h3>
                                <p className="text-tertiary text-xs mb-8">Added: {new Date(d.created_at).toLocaleDateString()}</p>

                                <div className="mt-auto space-y-3">
                                    <button
                                        onClick={() => handleTriggerScan(d.id, d.domain)}
                                        disabled={scanningDomain === d.domain}
                                        className="w-full glass-surface hover:bg-brand-500/10 border border-white/[0.06] hover:border-brand-500/25 text-primary py-2.5 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2 disabled:cursor-not-allowed"
                                    >
                                        {scanningDomain === d.domain ? (
                                            <Activity className="w-4 h-4 animate-spin text-brand-400" />
                                        ) : (
                                            <Play className="w-4 h-4 text-brand-400 group-hover:text-brand-300" />
                                        )}
                                        {scanningDomain === d.domain ? 'Dispatching...' : 'Force Manual Scan'}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
