import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
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
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen flex flex-col items-center relative">
        {/* Deep ambient background */}
        <div className="fixed inset-0 -z-20 bg-background" />

        {/* Ambient gradient orbs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-30%] left-[-15%] w-[55%] h-[55%] bg-brand-600/[0.07] rounded-full blur-[150px]" />
          <div className="absolute bottom-[-30%] right-[-15%] w-[55%] h-[55%] bg-brand-800/[0.07] rounded-full blur-[150px]" />
          <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-brand-500/[0.03] rounded-full blur-[120px]" />
        </div>

        {children}
        <Analytics />
      </body>
    </html>
  );
}
