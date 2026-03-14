import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NextLab — Enterprise Security Intelligence Platform',
  description:
    'Instant SSL, DNS, and reputation analysis. Automated weekly monitoring, breach alerts, and executive PDF reports for modern security teams.',
  keywords: ['security scanner', 'SSL checker', 'vulnerability assessment', 'CNDP compliance', 'cybersecurity SaaS'],
  openGraph: {
    title: 'NextLab — Enterprise Security Intelligence',
    description: 'Run instant security scans. Get automated monitoring & executive reports.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="antialiased min-h-screen flex flex-col items-center relative">
        {/* Deep ambient background */}
        <div className="fixed inset-0 -z-30 bg-[#050507]" />

        {/* Noise texture overlay */}
        <div className="fixed inset-0 -z-25 noise-overlay pointer-events-none" />

        {/* Mesh gradient ambient aura */}
        <div className="fixed inset-0 -z-20 mesh-gradient" />

        {/* Ambient gradient orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-30%] left-[-15%] w-[55%] h-[55%] bg-brand-500/[0.06] rounded-full blur-[180px]" />
          <div className="absolute bottom-[-30%] right-[-15%] w-[55%] h-[55%] bg-brand-700/[0.06] rounded-full blur-[180px]" />
          <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-brand-400/[0.03] rounded-full blur-[140px]" />
        </div>

        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
