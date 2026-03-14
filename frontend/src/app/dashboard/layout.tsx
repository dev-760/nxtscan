'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { LogOut, LayoutDashboard, Settings, Activity, Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            } else {
                setUser(session.user)
            }
            setLoading(false)
        }

        checkUser()

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!session) {
                    router.push('/login')
                }
            }
        )

        return () => {
            authListener.subscription.unsubscribe()
        }
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-secondary">
                    <Activity className="w-6 h-6 animate-spin text-brand-400" />
                    <p className="text-sm font-medium">Authenticating...</p>
                </div>
            </div>
        )
    }

    if (!user) return null

    const sidebarContent = (
        <>
            <Link href="/" className="mb-12 block">
                <Logo size="small" />
            </Link>
            <div className="flex-1 space-y-2">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-500/10 text-brand-400 font-medium border border-brand-500/20 glow-ring"
                    onClick={() => setSidebarOpen(false)}
                >
                    <LayoutDashboard className="w-5 h-5" /> Dashboard
                </Link>
                <button className="flex items-center w-full gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-secondary hover:text-primary font-medium transition-colors">
                    <Settings className="w-5 h-5" /> Settings
                </button>
            </div>

            <div className="pt-6 border-t border-white/[0.06] mt-auto">
                <div className="flex items-center gap-3 mb-4 px-1">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-400 text-sm font-bold">
                        {user.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <p className="text-sm text-secondary truncate flex-1">{user.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-error hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm"
                >
                    <LogOut className="w-5 h-5" /> Sign Out
                </button>
            </div>
        </>
    )

    return (
        <div className="min-h-screen bg-[#050507] text-primary flex">
            {/* Mobile top bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 nav-glass px-4 py-3 flex items-center justify-between">
                <Logo size="small" />
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 text-secondary hover:text-primary transition-colors"
                    aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                >
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile sidebar overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.nav
                            initial={{ x: -256 }}
                            animate={{ x: 0 }}
                            exit={{ x: -256 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[#09090b] border-r border-white/[0.06] flex flex-col p-6"
                        >
                            {sidebarContent}
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <nav className="w-64 border-r border-white/[0.06] bg-[#09090b] flex-col p-6 hidden md:flex relative overflow-hidden">
                {/* Sidebar ambient glow */}
                <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-brand-500/[0.03] to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full">
                    {sidebarContent}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative p-8 pt-20 md:pt-8">
                {/* Ambient orb */}
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

                {/* Noise overlay */}
                <div className="absolute inset-0 noise-overlay pointer-events-none -z-10" />

                {children}
            </main>
        </div>
    )
}
