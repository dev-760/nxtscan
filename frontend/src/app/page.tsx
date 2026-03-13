'use client';

import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Zap,
  Search,
  Globe,
  FileCheck,
  ArrowRight,
  Lock,
  BellRing,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  createStripeCheckoutSession,
  getScanPdfUrl,
  pollScan,
  ScanCheck,
  startFreeScan,
} from '@/lib/api';
import { normalizeDomain } from '@/lib/domain';

const features = [
  {
    title: "Instant Threat Detection",
    description: "Real-time analysis of SSL certificates, security headers, and basic vulnerabilities without any signup.",
    icon: <Zap className="w-6 h-6 text-brand-400" />,
  },
  {
    title: "Deep Infrastructure Scan",
    description: "Discover open ports, enumerate subdomains, and fingerprint technology stacks securely and remotely.",
    icon: <Search className="w-6 h-6 text-brand-400" />,
  },
  {
    title: "Continuous Monitoring",
    description: "Set it and forget it. We scan your domains weekly and alert you the moment your security posture changes.",
    icon: <BellRing className="w-6 h-6 text-brand-400" />,
  },
  {
    title: "Bilingual PDF Reports",
    description: "Generate executive-ready PDF reports in both Arabic and English, perfect for client presentations.",
    icon: <FileCheck className="w-6 h-6 text-brand-400" />,
  },
];

interface ScanResultViewModel {
  task_id: string;
  domain: string;
  ai_remediation: string;
  scan_data?: ScanCheck[];
}

export default function Home() {
  const [scanUrl, setScanUrl] = useState('');
  const [scanResult, setScanResult] = useState<ScanResultViewModel | null>(
    null,
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const handleUpgrade = async () => {
    setIsCheckoutLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push('/register');
      return;
    }

    try {
      const data = await createStripeCheckoutSession({
        user_id: session.user.id,
        email: session.user.email ?? '',
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      // In a production UI, you might surface a toast here
    }
    setIsCheckoutLoading(false);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanUrl) return;
    setIsScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      const domain = normalizeDomain(scanUrl);
      const start = await startFreeScan(domain);

      if (!start.task_id) throw new Error('Could not start scan.');

      // Polling Logic
      pollRef.current = setInterval(async () => {
        try {
          const pollData = await pollScan(start.task_id);

          if (pollData.status === 'completed' && pollData.result) {
            if (pollRef.current) clearInterval(pollRef.current);
            setIsScanning(false);
            setScanResult({ ...pollData.result, task_id: start.task_id });
          } else if (pollData.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setIsScanning(false);
            setScanError('Scan failed: ' + (pollData.error ?? 'Unknown error'));
          }
        } catch (e) {
          if (pollRef.current) clearInterval(pollRef.current);
          setIsScanning(false);
          setScanError('Error polling scan status.');
        }
      }, 3000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to trigger scan. Is backend running?';
      setIsScanning(false);
      setScanError(message);
    }
  };

  return (
    <main className="flex flex-col items-center w-full pb-32 overflow-x-hidden relative">
      {/* Enterprise Tech Mesh Grid Background */}
      <div className="absolute inset-0 w-full h-[150vh] bg-grid-pattern z-0 pointer-events-none opacity-40 mix-blend-screen" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[70%] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" />

      {/* Navigation */}
      <nav className="w-full max-w-7xl px-6 flex justify-between items-center py-6 relative z-50">
        <Logo className="scale-75 sm:scale-100 origin-left" />
        <div className="hidden md:flex gap-8 items-center text-sm font-medium text-gray-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
        </div>
        <div className="flex gap-4 items-center">
          <Link href="/login" className="hidden sm:block text-gray-300 hover:text-white transition-colors text-sm font-medium">Log in</Link>
          <Link href="/register" className="glass-accent hover:bg-brand-500/20 text-white px-5 py-2.5 rounded-full border border-brand-500/30 transition-all text-sm font-medium flex items-center justify-center glow-bg gap-2 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            Get Pro <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative w-full max-w-7xl px-6 mt-16 md:mt-28 flex flex-col items-center text-center z-10">

        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-brand-500/30 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-8 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          Next-Gen Scanner Engine v2.0
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-6xl md:text-8xl lg:text-[8rem] font-black tracking-tighter text-white mb-8 leading-[1]"
        >
          Enterprise Security <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-500 to-brand-700 glow-text relative inline-block">
            Made Invisible.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-2xl text-gray-400 max-w-3xl mb-14 font-medium tracking-tight"
        >
          Run instant SSL, DNS, and reputation checks in seconds.
          Upgrade for automated weekly monitoring, dark web breach alerts, and executive PDF reports.
        </motion.p>

        {/* Instant Scan Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-2xl relative group mb-24 z-20"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-purple-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <form onSubmit={handleScan} className="relative glass h-16 w-full rounded-2xl flex items-center p-2 shadow-2xl">
            <Globe className="w-6 h-6 text-gray-400 ml-4 mr-2" />
            <input
              type="text"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="Enter your domain (e.g. example.com)"
              className="flex-1 bg-transparent border-none outline-none text-white px-2 placeholder-gray-500 text-lg font-medium"
              required
            />
            <button
              type="submit"
              disabled={isScanning}
              className={`h-full px-8 rounded-xl font-bold transition-all btn-premium flex items-center justify-center gap-2 
                ${isScanning ? 'bg-brand-900/50 text-brand-300 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-500 text-white'}`}
            >
              {isScanning ? (
                <>
                  <Activity className="w-5 h-5 animate-pulse" /> Scanning...
                </>
              ) : (
                'Launch Test'
              )}
            </button>
          </form>
          <div className="mt-4 flex flex-col items-center gap-1 text-xs text-gray-500">
            <p className="flex items-center justify-center gap-2">
              <Shield className="w-3 h-3" /> No credit card required for free scans.
            </p>
            <p>
              We only query public records for the domain you enter and never store free scan targets.
            </p>
          </div>
        </motion.div>

        {/* Dynamic Scan Result Output Area */}
        {scanError && (
          <div className="w-full max-w-2xl glass border border-red-500/30 p-4 rounded-xl text-red-400 text-sm mb-20 animate-pulse">
            <Shield className="w-5 h-5 mx-auto mb-2" />
            {scanError}
          </div>
        )}

        {scanResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-3xl glass-accent border border-brand-500/30 rounded-2xl p-6 md:p-8 text-left mb-20 shadow-[0_0_30px_rgba(139,92,246,0.15)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Shield className="w-48 h-48" />
            </div>

            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4 relative z-10">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="text-brand-400" /> Executive Scan Result
                </h3>
                <p className="text-gray-400 font-mono text-sm mt-1">{scanResult.domain}</p>
              </div>
              <a
                href={getScanPdfUrl(scanResult.task_id)}
                target="_blank"
                rel="noreferrer"
                className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-brand-500/50"
              >
                <FileCheck className="w-4 h-4" /> Download PDF (AR)
              </a>
            </div>

            <div className="space-y-6 relative z-10">
              {/* AI Section */}
              <div className="bg-[#0f0f12]/80 p-5 rounded-xl border border-white/5">
                <h4 className="flex items-center gap-2 text-brand-300 font-bold mb-3">
                  <Zap className="w-4 h-4" /> AI Automation Remediations
                </h4>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {scanResult.ai_remediation}
                </div>
              </div>

              {/* Raw Checks Section */}
              <div>
                <h4 className="text-white font-bold mb-3">Vulnerability Footprint</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  {scanResult.scan_data?.map((check: any, i: number) => (
                    <div key={i} className="glass p-4 rounded-xl text-sm border border-white/5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-gray-200">{check.check_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${check.status === 'pass' ? 'bg-green-500/20 text-green-400' :
                          check.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                          {check.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{check.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* Trust & Social Proof / Marquee Background */}
      <section className="w-full border-y border-white/5 bg-[#0f0f12] py-12 flex flex-col items-center mb-32 overflow-hidden relative">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mb-8 relative z-10 text-center">Built on industry leading intelligence frameworks</p>

        {/* Fading left/right for marquee */}
        <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-[#0f0f12] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-[#0f0f12] to-transparent z-10 pointer-events-none"></div>

        <div className="flex w-[200%] gap-16 md:gap-32 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 animate-marquee items-center text-gray-400 relative z-0">
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Lock /> Let's Encrypt</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 text-[#E21F24] opacity-80 hover:opacity-100 hover:text-[#E21F24] transition-colors"><Search /> Shodan</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Shield /> HaveIBeenPwned</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Zap /> Vercel</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Globe /> CNDP Maroc</div>

          {/* Duplicate set for infinite loop visual */}
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Lock /> Let's Encrypt</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 text-[#E21F24] opacity-80 hover:opacity-100 hover:text-[#E21F24] transition-colors"><Search /> Shodan</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Shield /> HaveIBeenPwned</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Zap /> Vercel</div>
          <div className="flex items-center gap-3 text-2xl font-bold font-mono tracking-tight shrink-0 hover:text-white transition-colors"><Globe /> CNDP Maroc</div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="w-full max-w-7xl px-6 mb-32">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Complete Security Posture</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">Everything you need to secure your infrastructure, from simple header checks to deep port scanning and brand reputation monitoring.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              key={i}
              className="glass p-8 rounded-3xl border border-white/5 hover:border-brand-500/30 transition-colors group"
            >
              <div className="w-14 h-14 rounded-2xl glass-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Check Process Visual */}
      <section className="w-full max-w-7xl px-6 mb-32">
        <div className="glass-accent rounded-3xl p-1 border border-brand-500/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent"></div>
          <div className="bg-[#0f0f12] rounded-[22px] p-8 md:p-12 relative z-10 flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">Lightning fast intelligence gathering.</h2>
              <p className="text-gray-400 text-lg">Our asynchronous scanner queues dozens of checks instantly. We consolidate data from multiple APIs into a single, beautiful report.</p>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" /> SSL validation & expiration timeline</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" /> DMARC, SPF, and DKIM configuration</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" /> Open port discovery via Shodan</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0" /> Dark web breached email correlation</li>
              </ul>
            </div>

            {/* Fake Terminal */}
            <div className="flex-1 w-full glass border-white/10 rounded-xl overflow-hidden shadow-2xl">
              <div className="bg-white/5 px-4 py-3 border-b border-white/5 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="p-6 font-mono text-sm space-y-3 h-64 overflow-hidden relative">
                <div className="text-gray-400">$ nextscan target --domain example.com</div>
                <div className="text-blue-400">[i] Resolving DNS records... OK</div>
                <div className="text-green-400">[+] SSL Certificate valid for 284 days</div>
                <div className="text-yellow-400">[-] Missing strict-transport-security header</div>
                <div className="text-green-400">[+] SPF record firmly configured (~all)</div>
                <div className="text-blue-400">[i] Querying Shodan for open ports...</div>
                <motion.div
                  animate={{ opacity: [0, 1] }}
                  transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
                  className="w-2 h-4 bg-brand-400 inline-block"
                />
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#0f0f12] to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full max-w-6xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Transparent Pricing</h2>
          <p className="text-gray-400 text-lg">Start free. Upgrade as your security needs scale.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-center">
          {/* FREE */}
          <div className="glass p-8 rounded-3xl border border-white/5 h-full flex flex-col hover:border-white/20 transition-colors">
            <h3 className="text-xl font-bold text-white mb-2">Hobbyist</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-5xl font-extrabold text-white">$0</span>
              <span className="text-gray-500 mb-1">/forever</span>
            </div>
            <p className="text-sm text-gray-400 mb-8 pb-6 border-b border-white/10">Instant analysis with no account required.</p>
            <ul className="space-y-4 mb-8 text-sm text-gray-300 flex-1">
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> 1 scan per day</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> Basic vulnerability checks</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> SSL & headers validation</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> No signup required</li>
            </ul>
            <button className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10">
              Start Free Scan
            </button>
          </div>

          {/* PRO - Popular */}
          <div className="relative glass-accent p-8 rounded-3xl border-2 border-brand-500/50 transform lg:-translate-y-4 shadow-[0_0_40px_rgba(139,92,246,0.15)] z-10 flex flex-col h-[105%]">
            <div className="absolute -top-4 left-0 right-0 flex justify-center">
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Professional</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-6xl font-extrabold text-white">$9</span>
              <span className="text-gray-400 mb-2">/mo</span>
            </div>
            <p className="text-sm text-gray-300 mb-8 pb-6 border-b border-brand-500/20">For professionals who need automated monitoring.</p>
            <ul className="space-y-4 mb-8 text-sm text-white flex-1 font-medium">
              <li className="flex items-center gap-3"><CheckCircle2 className="text-brand-400 w-5 h-5 flex-shrink-0" /> Unlimited scans</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-brand-400 w-5 h-5 flex-shrink-0" /> 15 Advanced security checks</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-brand-400 w-5 h-5 flex-shrink-0" /> Automated weekly monitoring</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-brand-400 w-5 h-5 flex-shrink-0" /> Real-time email alerts</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-brand-400 w-5 h-5 flex-shrink-0" /> Downloadable PDF Reports</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-brand-400 w-5 h-5 flex-shrink-0" /> 30-day history retention</li>
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-lg transition-all btn-premium flex justify-center items-center gap-2 mt-2"
            >
              {isCheckoutLoading ? <Activity className="w-5 h-5 animate-spin text-white" /> : <Shield className="w-5 h-5 border-white" />}
              {isCheckoutLoading ? 'Secure Request...' : 'Upgrade Now'}
            </button>
          </div>

          {/* AGENCY */}
          <div className="glass p-8 rounded-3xl border border-white/5 h-full flex flex-col hover:border-white/20 transition-colors">
            <h3 className="text-xl font-bold text-white mb-2">Agency</h3>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-5xl font-extrabold text-white">$29</span>
              <span className="text-gray-500 mb-1">/mo</span>
            </div>
            <p className="text-sm text-gray-400 mb-8 pb-6 border-b border-white/10">White-label reports for multiple clients.</p>
            <ul className="space-y-4 mb-8 text-sm text-gray-300 flex-1">
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> Up to 10 monitored domains</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> White-label PDF branding</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> Client report sharing links</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> Priority API access</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="text-gray-500 w-5 h-5 flex-shrink-0" /> Direct support line</li>
            </ul>
            <button className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="w-full max-w-4xl mt-32 text-center px-6">
        <div className="glass-accent p-12 rounded-[2.5rem] border border-brand-500/20 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-500/10 blur-[100px] -z-10"></div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Securing the web, one scan at a time.</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">Join hundreds of developers and agencies trusting NextLab to monitor their digital perimeter.</p>
          <Link href="/register" className="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl font-bold transition-all text-lg gap-2 btn-premium">
            Get Started Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
