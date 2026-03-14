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
  ChevronRight,
  Fingerprint,
  ScanLine,
  ShieldCheck,
  Eye,
  Menu,
  X,
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

/* ─── Data ────────────────────────────────────────────────── */

const features = [
  {
    title: 'Instant Threat Detection',
    description:
      'Real-time SSL certificate analysis, security headers validation, and vulnerability detection — no signup required.',
    icon: <Zap className="w-5 h-5" />,
    gradient: 'from-amber-500/20 to-orange-600/20',
    iconColor: 'text-amber-400',
  },
  {
    title: 'Deep Infrastructure Scan',
    description:
      'Discover open ports, enumerate subdomains, and fingerprint technology stacks through secure remote reconnaissance.',
    icon: <Search className="w-5 h-5" />,
    gradient: 'from-cyan-500/20 to-blue-600/20',
    iconColor: 'text-cyan-400',
  },
  {
    title: 'Continuous Monitoring',
    description:
      'Automated weekly scans with instant alerts the moment your security posture changes. Set it and forget it.',
    icon: <BellRing className="w-5 h-5" />,
    gradient: 'from-emerald-500/20 to-green-600/20',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'Executive PDF Reports',
    description:
      'Generate bilingual Arabic & English reports with AI-powered remediation steps, ready for board presentations.',
    icon: <FileCheck className="w-5 h-5" />,
    gradient: 'from-violet-500/20 to-purple-600/20',
    iconColor: 'text-violet-400',
  },
];

const trustLogos = [
  { name: "Let's Encrypt", icon: <Lock className="w-5 h-5" /> },
  { name: 'Shodan', icon: <Eye className="w-5 h-5" /> },
  { name: 'HaveIBeenPwned', icon: <Fingerprint className="w-5 h-5" /> },
  { name: 'Vercel', icon: <Zap className="w-5 h-5" /> },
  { name: 'CNDP Maroc', icon: <Globe className="w-5 h-5" /> },
  { name: 'Supabase', icon: <Shield className="w-5 h-5" /> },
];

const checkItems = [
  'SSL validation & expiration timeline',
  'DMARC, SPF, and DKIM configuration',
  'Open port discovery via Shodan',
  'Dark web breached email correlation',
  'Security header enforcement',
  'CNDP regulatory compliance check',
];

const terminalLines = [
  { text: '$ nextscan target --domain example.com', color: 'text-gray-300' },
  { text: '[i] Resolving DNS records... OK', color: 'text-blue-400' },
  { text: '[+] SSL Certificate valid for 284 days', color: 'text-emerald-400' },
  { text: '[-] Missing strict-transport-security header', color: 'text-amber-400' },
  { text: '[+] SPF record configured (~all)', color: 'text-emerald-400' },
  { text: '[i] Querying Shodan for open ports...', color: 'text-blue-400' },
  { text: '[+] No breached emails found', color: 'text-emerald-400' },
  { text: '[i] Generating AI remediation...', color: 'text-brand-400' },
];

/* ─── Animation Variants ──────────────────────────────────── */

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

/* ─── Types ───────────────────────────────────────────────── */

interface ScanResultViewModel {
  task_id: string;
  domain: string;
  ai_remediation: string;
  scan_data?: ScanCheck[];
}

/* ─── Component ───────────────────────────────────────────── */

export default function Home() {
  const [scanUrl, setScanUrl] = useState('');
  const [scanResult, setScanResult] = useState<ScanResultViewModel | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
            setScanError(
              'Scan failed: ' + (pollData.error ?? 'Unknown error'),
            );
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setIsScanning(false);
          setScanError('Error polling scan status.');
        }
      }, 3000);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to trigger scan. Is the backend running?';
      setIsScanning(false);
      setScanError(message);
    }
  };

  return (
    <main className="flex flex-col items-center w-full pb-32 overflow-x-hidden relative">
      {/* Mesh Grid Background */}
      <div className="absolute inset-0 w-full h-[180vh] bg-grid-pattern z-0 pointer-events-none opacity-60" />

      {/* ━━━ Navigation ━━━ */}
      <nav className="w-full max-w-7xl px-6 flex justify-between items-center py-5 relative z-50">
        <Logo />

        {/* Desktop links */}
        <div className="hidden md:flex gap-8 items-center text-sm font-medium text-gray-400">
          <Link
            href="#features"
            className="hover:text-white transition-colors duration-200"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="hover:text-white transition-colors duration-200"
          >
            How it Works
          </Link>
          <Link
            href="#pricing"
            className="hover:text-white transition-colors duration-200"
          >
            Pricing
          </Link>
        </div>

        <div className="flex gap-3 items-center">
          <Link
            href="/login"
            className="hidden sm:block text-gray-300 hover:text-white transition-colors text-sm font-medium px-4 py-2"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all btn-premium flex items-center gap-2"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden w-full px-6 pb-6 relative z-50"
        >
          <div className="glass rounded-2xl p-4 space-y-1">
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm font-medium"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm font-medium"
            >
              How it Works
            </Link>
            <Link
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-sm font-medium"
            >
              Pricing
            </Link>
          </div>
        </motion.div>
      )}

      {/* ━━━ Hero Section ━━━ */}
      <section className="relative w-full max-w-7xl px-6 mt-16 md:mt-28 flex flex-col items-center text-center z-10">
        {/* Animated status badge */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider mb-10"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          Systems Operational — Engine v2.0
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8 leading-[0.95]"
        >
          Security Intelligence
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 glow-text">
            Made Simple.
          </span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mb-12 font-medium leading-relaxed"
        >
          Run instant SSL, DNS, and reputation checks in seconds.
          <br className="hidden sm:block" />
          Upgrade for automated monitoring, breach alerts, and executive reports.
        </motion.p>

        {/* ─── Scan Input ─── */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-2xl relative group mb-16 z-20"
        >
          {/* Glow behind input */}
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/30 via-brand-600/20 to-brand-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <form
            onSubmit={handleScan}
            className="relative glass rounded-2xl flex items-center p-2 shadow-2xl glow-ring"
          >
            <ScanLine className="w-5 h-5 text-gray-500 ml-4 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="Enter your domain (e.g. example.com)"
              className="flex-1 bg-transparent border-none outline-none text-white px-2 placeholder-gray-500 text-base font-medium min-w-0"
              required
            />
            <button
              type="submit"
              disabled={isScanning}
              className={`h-12 px-6 sm:px-8 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm flex-shrink-0
                ${
                  isScanning
                    ? 'bg-brand-900/50 text-brand-300 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-500 text-white btn-premium'
                }`}
            >
              {isScanning ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" /> Scanning...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Scan Now
                </>
              )}
            </button>
          </form>

          <div className="mt-4 flex flex-col items-center gap-1.5 text-xs text-gray-500">
            <p className="flex items-center gap-2">
              <Lock className="w-3 h-3" /> No credit card required · Results
              in under 30 seconds
            </p>
          </div>
        </motion.div>

        {/* ─── Scan Error ─── */}
        {scanError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl glass border border-red-500/20 p-5 rounded-2xl mb-16"
          >
            <div className="flex items-start gap-3 text-red-400 text-sm">
              <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Scan Error</p>
                <p className="text-red-400/80">{scanError}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Scan Result ─── */}
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl glass rounded-3xl p-6 md:p-8 text-left mb-16 relative overflow-hidden gradient-border"
          >
            {/* Subtle bg accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-5 border-b border-white/5 relative z-10">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-brand-400" />
                  Scan Report
                </h3>
                <p className="text-gray-400 font-mono text-sm">
                  {scanResult.domain}
                </p>
              </div>
              <a
                href={getScanPdfUrl(scanResult.task_id)}
                target="_blank"
                rel="noreferrer"
                className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all btn-premium flex-shrink-0"
              >
                <FileCheck className="w-4 h-4" /> Download PDF
              </a>
            </div>

            <div className="space-y-5 relative z-10">
              {/* AI Remediation Section */}
              <div className="glass-surface p-5 rounded-2xl">
                <h4 className="flex items-center gap-2 text-brand-400 font-semibold text-sm mb-3">
                  <Zap className="w-4 h-4" /> AI-Powered Remediation
                </h4>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {scanResult.ai_remediation}
                </div>
              </div>

              {/* Checks Grid */}
              <div>
                <h4 className="text-white font-semibold text-sm mb-3">
                  Vulnerability Assessment
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {scanResult.scan_data?.map(
                    (check: ScanCheck, i: number) => (
                      <div
                        key={i}
                        className="glass-surface p-4 rounded-xl text-sm"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-200">
                            {check.check_name}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                              check.status === 'pass'
                                ? 'badge-pass'
                                : check.status === 'warning'
                                  ? 'badge-warning'
                                  : 'badge-fail'
                            }`}
                          >
                            {check.status}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs leading-relaxed">
                          {check.detail}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* ━━━ Trust Bar ━━━ */}
      <section className="w-full py-14 overflow-hidden relative mb-24">
        <div className="section-divider mb-12" />
        <p className="text-gray-500 text-[11px] font-semibold uppercase tracking-[0.25em] mb-10 text-center">
          Powered by leading intelligence frameworks
        </p>

        <div className="relative">
          <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          <div className="flex w-[200%] gap-20 opacity-40 animate-marquee items-center text-gray-400">
            {[...trustLogos, ...trustLogos].map((logo, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-lg font-semibold font-mono tracking-tight shrink-0 hover:text-white hover:opacity-100 transition-all duration-300"
              >
                {logo.icon}
                {logo.name}
              </div>
            ))}
          </div>
        </div>
        <div className="section-divider mt-12" />
      </section>

      {/* ━━━ Features Grid ━━━ */}
      <section id="features" className="w-full max-w-7xl px-6 mb-32">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-4">
            Capabilities
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            Complete Security Posture
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Everything you need to secure your infrastructure, from header
            checks to deep port scanning and reputation monitoring.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-5"
        >
          {features.map((feature, i) => (
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.4 }}
              key={i}
              className="glass p-7 rounded-2xl hover:border-brand-500/20 transition-all duration-300 card-hover group relative overflow-hidden"
            >
              {/* Subtle gradient accent */}
              <div
                className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${feature.gradient} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
              />

              <div
                className={`w-11 h-11 rounded-xl glass-accent flex items-center justify-center mb-5 ${feature.iconColor} relative z-10`}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-2 relative z-10">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed text-sm relative z-10">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ━━━ How It Works Section ━━━ */}
      <section id="how-it-works" className="w-full max-w-7xl px-6 mb-32">
        <div className="glass rounded-3xl overflow-hidden relative gradient-border">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/[0.04] to-transparent pointer-events-none" />

          <div className="p-8 md:p-14 relative z-10 flex flex-col lg:flex-row gap-12 items-center">
            {/* Text content */}
            <div className="flex-1 space-y-6">
              <p className="text-brand-400 text-sm font-semibold uppercase tracking-wider">
                How it Works
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight tracking-tight">
                Lightning-fast
                <br />
                intelligence gathering.
              </h2>
              <p className="text-gray-400 text-base leading-relaxed">
                Our asynchronous scanner queues dozens of checks in parallel.
                We consolidate data from multiple APIs into a single,
                comprehensive report.
              </p>
              <ul className="space-y-3">
                {checkItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-gray-300 text-sm"
                  >
                    <CheckCircle2 className="text-emerald-500 w-4 h-4 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Terminal mockup */}
            <div className="flex-1 w-full">
              <div className="glass rounded-2xl overflow-hidden shadow-2xl border border-white/5">
                {/* Title bar */}
                <div className="bg-white/[0.03] px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <span className="text-gray-500 text-xs font-mono ml-3">
                    nextlab-scanner
                  </span>
                </div>

                {/* Terminal content */}
                <div className="p-6 font-mono text-[13px] space-y-2.5 min-h-[280px] relative">
                  {terminalLines.map((line, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 }}
                      className={line.color}
                    >
                      {line.text}
                    </motion.div>
                  ))}

                  {/* Blinking cursor */}
                  <div className="flex items-center gap-0.5 mt-2">
                    <span className="text-gray-500">$</span>
                    <span className="w-2 h-4 bg-brand-400 animate-blink ml-1" />
                  </div>

                  {/* Bottom fade */}
                  <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-[#0c0c12] to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ Pricing Section ━━━ */}
      <section id="pricing" className="w-full max-w-6xl px-6 mb-32">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-brand-400 text-sm font-semibold uppercase tracking-wider mb-4">
            Pricing
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Transparent Pricing
          </h2>
          <p className="text-gray-400 text-lg">
            Start free. Upgrade as your security needs scale.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* FREE */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0 }}
            viewport={{ once: true }}
            className="glass p-8 rounded-3xl h-full flex flex-col card-hover"
          >
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Hobbyist</h3>
              <p className="text-gray-500 text-sm">
                Instant analysis, no account required
              </p>
            </div>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-5xl font-extrabold text-white">$0</span>
              <span className="text-gray-500 mb-1.5 text-sm">/forever</span>
            </div>
            <div className="h-px bg-white/5 mb-8" />
            <ul className="space-y-4 mb-10 text-sm text-gray-300 flex-1">
              {[
                '1 scan per day',
                'Basic vulnerability checks',
                'SSL & headers validation',
                'No signup required',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-gray-600 w-4 h-4 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3.5 rounded-xl btn-ghost text-white font-medium text-sm">
              Start Free Scan
            </button>
          </motion.div>

          {/* PRO */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            viewport={{ once: true }}
            className="relative glass-accent p-8 rounded-3xl border-brand-500/30 shadow-[0_0_60px_rgba(108,79,255,0.08)] z-10 flex flex-col lg:-translate-y-3"
          >
            <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
              <span className="bg-gradient-to-r from-brand-500 to-brand-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">
                Professional
              </h3>
              <p className="text-gray-400 text-sm">
                Automated monitoring for professionals
              </p>
            </div>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-5xl font-extrabold text-white">$9</span>
              <span className="text-gray-400 mb-1.5 text-sm">/month</span>
            </div>
            <div className="h-px bg-brand-500/10 mb-8" />
            <ul className="space-y-4 mb-10 text-sm text-gray-200 flex-1 font-medium">
              {[
                'Unlimited scans',
                '15 Advanced security checks',
                'Automated weekly monitoring',
                'Real-time email alerts',
                'Downloadable PDF Reports',
                '30-day history retention',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-brand-400 w-4 h-4 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgrade}
              disabled={isCheckoutLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm transition-all btn-premium flex justify-center items-center gap-2"
            >
              {isCheckoutLoading ? (
                <Activity className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {isCheckoutLoading ? 'Processing...' : 'Upgrade Now'}
            </button>
          </motion.div>

          {/* AGENCY */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.2 }}
            viewport={{ once: true }}
            className="glass p-8 rounded-3xl h-full flex flex-col card-hover"
          >
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-1">Agency</h3>
              <p className="text-gray-500 text-sm">
                White-label reports for multiple clients
              </p>
            </div>
            <div className="flex items-end gap-1 mb-8">
              <span className="text-5xl font-extrabold text-white">$29</span>
              <span className="text-gray-500 mb-1.5 text-sm">/month</span>
            </div>
            <div className="h-px bg-white/5 mb-8" />
            <ul className="space-y-4 mb-10 text-sm text-gray-300 flex-1">
              {[
                'Up to 10 monitored domains',
                'White-label PDF branding',
                'Client report sharing links',
                'Priority API access',
                'Direct support line',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="text-gray-600 w-4 h-4 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button className="w-full py-3.5 rounded-xl btn-ghost text-white font-medium text-sm">
              Contact Sales
            </button>
          </motion.div>
        </div>
      </section>

      {/* ━━━ Bottom CTA ━━━ */}
      <section className="w-full max-w-4xl px-6">
        <div className="glass-accent p-12 md:p-16 rounded-3xl relative overflow-hidden text-center gradient-border">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.05] to-transparent pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-brand-500/[0.06] blur-[100px] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 tracking-tight">
              Securing the web,
              <br />
              one scan at a time.
            </h2>
            <p className="text-gray-400 text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              Join hundreds of developers and agencies trusting NextLab to
              monitor their digital perimeter.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl font-bold transition-all text-base gap-2 btn-premium"
            >
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ Footer ━━━ */}
      <footer className="w-full max-w-7xl px-6 mt-24 pb-12">
        <div className="section-divider mb-10" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="text-gray-600 text-sm">
              © {new Date().getFullYear()} NextLab. All rights reserved.
            </span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link
              href="#"
              className="hover:text-gray-300 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="hover:text-gray-300 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="hover:text-gray-300 transition-colors"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
