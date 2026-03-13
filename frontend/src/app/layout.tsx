import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'NextLab - Security Scanner SaaS',
  description: 'Enterprise grade security scanning at your fingertips.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased min-h-screen flex flex-col items-center">
        {/* Abstract background blobs for dynamic feel */}
        <div className="absolute top-0 w-full h-full overflow-hidden -z-10 bg-background">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-500/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-700/20 rounded-full blur-[120px]"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
