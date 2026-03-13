'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { LogOut, LayoutDashboard, Settings } from 'lucide-react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
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
        return <div className="min-h-screen flex items-center justify-center text-brand-500">Authenticating...</div>
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-background text-white flex">
            {/* Sidebar Navigation */}
            <nav className="w-64 border-r border-white/5 bg-[#0a0a0b] flex flex-col p-6 hidden md:flex">
                <Link href="/" className="mb-12">
                    <Logo className="scale-75 origin-left" />
                </Link>
                <div className="flex-1 space-y-2">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-500/10 text-brand-400 font-medium border border-brand-500/20">
                        <LayoutDashboard className="w-5 h-5" /> Dashboard
                    </Link>
                    <button className="flex items-center w-full gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white font-medium transition-colors">
                        <Settings className="w-5 h-5" /> Settings
                    </button>
                </div>

                <div className="pt-6 border-t border-white/5 mt-auto">
                    <p className="text-sm text-gray-400 truncate mb-4">{user.email}</p>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="w-5 h-5" /> Sign Out
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative p-8">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-700/5 rounded-full blur-[120px] pointer-events-none"></div>
                {children}
            </main>
        </div>
    )
}
