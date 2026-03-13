'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Activity, AlertTriangle, CheckCircle, Globe, Play } from 'lucide-react'
import { motion } from 'framer-motion'
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

    const handleTriggerScan = async (domainId: string, domainStr: string) => {
        setFeedback(null)
        setScanningDomain(domainStr)
        // Normally you would pass the JWT Token to the Python backend here to authenticate,
        // e.g. using `const { data: { session } } = await supabase.auth.getSession();`
        // const token = session?.access_token;

        // As a simplification for MVP, we just ping the pro endpoint directly.
        try {
            await triggerProScan(domainStr, domainId)
            setFeedback({
                type: 'success',
                message: `Automated intelligence scan queued for ${domainStr}.`,
            })
        } catch (err) {
            setFeedback({
                type: 'error',
                message: 'Scan request failed. Please try again in a moment.',
            })
        }
        setScanningDomain(null)
    }

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Activity className="w-6 h-6 animate-spin text-brand-400" />
                    <p>Securing your workspace…</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto flex flex-col pt-12">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-white mb-2">Monitored Perimeters</h1>
                    <p className="text-gray-400">View and protect your active domains.</p>
                </div>

                <form onSubmit={handleAddDomain} className="flex gap-2 relative">
                    <input
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="target.com"
                        className="bg-[#0f0f12] border border-white/10 rounded-xl px-4 py-2.5 text-white max-w-[200px] outline-none focus:border-brand-500"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-brand-600 hover:bg-brand-500 disabled:bg-brand-900/40 disabled:text-brand-300 text-white rounded-xl px-4 py-2.5 font-bold transition-all flex items-center gap-2 border border-brand-500/50"
                    >
                        <Plus className="w-5 h-5" /> Add
                    </button>
                </form>
            </div>

            {feedback && (
                <div
                    className={`mb-8 rounded-2xl border px-4 py-3 flex items-center gap-3 text-sm ${
                        feedback.type === 'success'
                            ? 'border-green-500/40 bg-green-500/10 text-green-300'
                            : 'border-red-500/40 bg-red-500/10 text-red-300'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    )}
                    <p>{feedback.message}</p>
                </div>
            )}

            {domains.length === 0 ? (
                <div className="text-center py-20 glass rounded-3xl border border-white/5 border-dashed">
                    <Globe className="w-16 h-16 text-brand-500/30 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">No infrastructure mapped</h3>
                    <p className="text-gray-400">Add your first domain above to schedule automated intelligence checks.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {domains.map(d => (
                        <motion.div
                            key={d.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass p-6 rounded-2xl border border-white/5 hover:border-brand-500/30 transition-all flex flex-col group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-brand-500/10 p-2.5 rounded-xl border border-brand-500/20">
                                    <Globe className="w-6 h-6 text-brand-400" />
                                </div>
                                <span className="bg-green-500/10 text-green-400 text-xs font-bold px-2 py-1 rounded">Monitoring</span>
                            </div>

                            <h3 className="text-xl font-bold text-white font-mono break-all leading-tight mb-2">{d.domain}</h3>
                            <p className="text-gray-500 text-xs mb-8">Added: {new Date(d.created_at).toLocaleDateString()}</p>

                            <div className="mt-auto space-y-3">
                                <button
                                    onClick={() => handleTriggerScan(d.id, d.domain)}
                                    disabled={scanningDomain === d.domain}
                                    className="w-full bg-[#161618] hover:bg-brand-500/10 border border-white/5 hover:border-brand-500/30 text-white py-2.5 rounded-xl text-sm font-semibold transition-all flex justify-center items-center gap-2"
                                >
                                    {scanningDomain === d.domain ? <Activity className="w-4 h-4 animate-spin text-brand-400" /> : <Play className="w-4 h-4 text-brand-400 group-hover:text-brand-300" />}
                                    {scanningDomain === d.domain ? 'Dispatching...' : 'Force Manual Scan'}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
