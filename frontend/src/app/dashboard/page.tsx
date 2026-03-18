'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Activity, AlertTriangle, CheckCircle, Globe, Play, Shield, Trash2, X, ShieldCheck, Zap, Lock, Server, Bell, Search, Settings, PieChart, Layers, Download, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerProScan } from '@/lib/api'
import { normalizeDomain } from '@/lib/domain'

interface Domain {
    id: string
    domain: string
    created_at: string
}

export default function Dashboard() {
    const [domains, setDomains] = useState<Domain[]>([])
    const [newDomain, setNewDomain] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [scanningDomain, setScanningDomain] = useState<string | null>(null)
    const [isAuthLoading, setIsAuthLoading] = useState(true)
    const [plan, setPlan] = useState<'free' | 'pro' | 'agency' | null>(null)
    const [activeTab, setActiveTab] = useState('overview')
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
                    message: `Asset ${cleanedDomain} successfully provisioned for continuous monitoring.`,
                })
                fetchDomains()
            } else {
                setFeedback({
                    type: 'error',
                    message: 'Provisioning failed. The asset may already exist in your environment.',
                })
            }
        }
        setIsLoading(false)
    }

    const handleDeleteDomain = async (domainId: string) => {
        const { error } = await supabase.from('domains').delete().eq('id', domainId)
        if (!error) {
            setFeedback({ type: 'success', message: 'Asset removed from monitoring perimeter.' })
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
                message: `Automated threat intelligence scan initiated for ${domainStr}.`,
            })
        } catch (err) {
            console.error('Scan trigger failed:', err)
            setFeedback({
                type: 'error',
                message: 'Scan initiation failed. Ensure backend services are responsive.',
            })
        }
        setScanningDomain(null)
    }

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b]">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-4 border-brand-400/20 border-b-brand-400 rounded-full animate-spin-reverse"></div>
                        <Lock className="w-6 h-6 text-brand-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase">Authenticating Session</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0b] text-slate-200 flex flex-col md:flex-row font-sans overflow-hidden selection:bg-brand-500/30">
            {/* Ambient Background Lights */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

            {/* Global Feedback Toast */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50 min-w-[400px]"
                    >
                        <div className={`p-[1px] rounded-2xl bg-gradient-to-b ${feedback.type === 'success' ? 'from-emerald-500/50 to-emerald-500/10' : 'from-red-500/50 to-red-500/10'} shadow-2xl backdrop-blur-xl`}>
                            <div className="bg-[#0f1014] rounded-[15px] px-5 py-4 flex items-center gap-4">
                                <div className={`p-2 rounded-xl ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                </div>
                                <p className="flex-1 font-medium text-sm text-slate-200">{feedback.message}</p>
                                <button onClick={() => setFeedback(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className="w-full md:w-64 border-r border-white/5 bg-[#0f1014]/80 backdrop-blur-2xl flex flex-col z-20 shrink-0">
                <div className="h-20 flex items-center px-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">NxtScan</span>
                    </div>
                </div>

                <div className="p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 px-3">Main Menu</div>
                    <nav className="space-y-1">
                        {[
                            { id: 'overview', icon: PieChart, label: 'Overview' },
                            { id: 'assets', icon: Layers, label: 'Asset Inventory', badge: domains.length },
                            { id: 'scans', icon: Activity, label: 'Scan History' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    activeTab === item.id 
                                        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-[inset_0_0_15px_rgba(139,92,246,0.05)]' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="w-4 h-4" />
                                    {item.label}
                                </div>
                                {item.badge !== undefined && (
                                    <span className="bg-white/10 text-slate-300 text-xs py-0.5 px-2 rounded-md font-mono">{item.badge}</span>
                                )}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-white/5">
                    <div className="bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-xl p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-20"><Zap className="w-12 h-12" /></div>
                        <div className="relative z-10">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Open Source</p>
                            <p className="text-sm font-semibold text-white capitalize flex items-center gap-2 mb-3">
                                Community Edition <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                            </p>
                            <a href="https://github.com/nxtscan" target="_blank" rel="noreferrer" className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white text-xs font-bold rounded-lg transition-all flex justify-center items-center">
                                View GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
                {/* Topbar */}
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 shrink-0 bg-[#0f1014]/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold text-white tracking-tight">Enterprise Dashboard</h1>
                        <div className="h-5 w-px bg-white/10"></div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" /> Runtime Protection Active
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input 
                                type="text" 
                                placeholder="Search perimeter..." 
                                className="bg-[#15161A] border border-white/5 rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all w-64"
                            />
                        </div>
                        <button className="p-2 rounded-full border border-white/5 bg-[#15161A] text-slate-400 hover:text-white transition-colors relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-brand-500 border-2 border-[#15161A]"></span>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">AD</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* KPI Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {[
                                { title: 'Security Score', value: '94/100', icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                                { title: 'Monitored Assets', value: domains.length.toString(), icon: Server, color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/20' },
                                { title: 'Open Vulnerabilities', value: '0', icon: AlertTriangle, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
                                { title: 'Scans Last 30 Days', value: (domains.length * 4).toString(), icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                            ].map((kpi, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                    key={kpi.title} 
                                    className="bg-gradient-to-b from-[#15161A] to-[#0f1014] p-5 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden group hover:border-white/10 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.border} border`}>
                                            <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                                        </div>
                                    </div>
                                    <h3 className="text-3xl font-bold text-white tracking-tight mb-1">{kpi.value}</h3>
                                    <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
                                    
                                    <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-500 pointer-events-none">
                                        <kpi.icon className="w-32 h-32" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Add Domain & Controls */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                            className="bg-[#15161A]/80 border border-white/5 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row gap-6 items-center justify-between"
                        >
                            <div>
                                <h2 className="text-lg font-bold text-white mb-1">Provision New Asset</h2>
                                <p className="text-sm text-slate-400">Add a domain to automatically enroll it in continuous security monitoring.</p>
                            </div>
                            <form onSubmit={handleAddDomain} className="flex gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-72">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        placeholder="e.g. production-api.com"
                                        className="w-full bg-[#0a0a0b] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all shadow-inner"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading || !newDomain.trim()}
                                    className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shrink-0 shadow-lg shadow-brand-500/20"
                                >
                                    {isLoading ? <Activity className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Deploy Sensor
                                </button>
                            </form>
                        </motion.div>

                        {/* Asset Inventory Table */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                            className="bg-gradient-to-b from-[#15161A] to-[#0f1014] border border-white/5 rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Layers className="w-5 h-5 text-slate-400" />
                                    <h3 className="font-bold text-white">Monitored Infrastructure</h3>
                                    <span className="bg-white/5 text-slate-400 text-xs px-2 py-0.5 rounded-md border border-white/5">{domains.length} Total</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors">
                                        <Filter className="w-3.5 h-3.5" /> Filter
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors">
                                        <Download className="w-3.5 h-3.5" /> Export Report
                                    </button>
                                </div>
                            </div>
                            
                            {domains.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                                        <Globe className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-300 mb-1">No Assets Provisioned</h4>
                                    <p className="text-sm text-slate-500 max-w-sm mx-auto">Your perimeter is currently empty. Add your first domain above to initialize continuous scanning.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="text-xs text-slate-500 bg-white/[0.02] border-b border-white/5 uppercase tracking-wider font-semibold">
                                            <tr>
                                                <th className="px-6 py-4">Asset Domain</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Provisioned Date</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <AnimatePresence>
                                                {domains.map((d) => (
                                                    <motion.tr 
                                                        key={d.id}
                                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                        className="hover:bg-white/[0.02] transition-colors group"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-[#0a0a0b] border border-white/10 flex items-center justify-center">
                                                                    <Globe className="w-4 h-4 text-brand-400" />
                                                                </div>
                                                                <span className="font-mono text-slate-200 font-medium">{d.domain}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                                                <span className="text-slate-300 font-medium text-xs">Monitored</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                                            {new Date(d.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleTriggerScan(d.id, d.domain)}
                                                                    disabled={scanningDomain === d.domain}
                                                                    className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-brand-500/20 disabled:opacity-50"
                                                                >
                                                                    {scanningDomain === d.domain ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                                                    {scanningDomain === d.domain ? 'Scanning...' : 'Scan Now'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteDomain(d.id)}
                                                                    className="p-1.5 rounded-lg text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                                                                    title="Remove Asset"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </main>
            
            {/* Custom Scrollbar CSS (since we don't want to touch global.css for this specific change, add inline) */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background-color: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    )
}
