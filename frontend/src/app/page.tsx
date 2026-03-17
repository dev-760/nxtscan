'use client';

import Link from 'next/link';
import {
  Shield,
  Zap,
  Search,
  Globe,
  FileCheck,
  ArrowRight,
  Lock,
  Activity,
  CheckCircle2,
  ScanLine,
  ShieldCheck,
  Menu,
  X,
  Sparkles,
  Server
} from 'lucide-react';
import { useEffect, useRef, useState, FormEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  getScanPdfUrl,
  pollScan,
  ScanCheck,
  startFreeScan,
} from '@/lib/api';
import { normalizeDomain } from '@/lib/domain';

const features = [
  {
    title: 'Instant Threat Detection',
    description: 'Real-time SSL certificate analysis, security headers validation, and vulnerability detection.',
    icon: <Zap className="w-6 h-6" />,
  },
  {
    title: 'Deep Infrastructure Scan',
    description: 'Discover open ports, enumerate subdomains, and fingerprint technology stacks.',
    icon: <Search className="w-6 h-6" />,
  },
  {
    title: 'Executive PDF Reports',
    description: 'Generate bilingual Arabic & English reports with AI-powered remediation steps.',
    icon: <FileCheck className="w-6 h-6" />,
  },
];

const trustLogos = [
  { name: 'Cloudflare', icon: <Server className="w-5 h-5" /> },
  { name: 'Let\'s Encrypt', icon: <Lock className="w-5 h-5" /> },
  { name: 'Shodan', icon: <Search className="w-5 h-5" /> },
  { name: 'AWS', icon: <Zap className="w-5 h-5" /> },
  { name: 'Supabase', icon: <Shield className="w-5 h-5" /> },
];

const scanSteps = [
  'Resolving DNS records',
  'Validating SSL certificate',
  'Checking security headers',
  'Scanning open ports',
  'Analyzing email breaches',
  'Generating AI report',
];

interface ScanResultViewModel {
  task_id: string;
  domain: string;
  ai_remediation: string;
  scan_data?: ScanCheck[];
}

export default function Home() {
  const [scanUrl, setScanUrl] = useState('');
  const [scanResult, setScanResult] = useState<ScanResultViewModel | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [showDownloadPrompt, setShowDownloadPrompt] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const scanStepRef = useRef<NodeJS.Timeout | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (scanStepRef.current) clearInterval(scanStepRef.current);
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleScan = async (e: FormEvent) => {
    e.preventDefault();
    if (!scanUrl) return;
    setIsScanning(true);
    setScanResult(null);
    setShowDownloadPrompt(false);
    setScanError(null);
    setScanStep(0);

    scanStepRef.current = setInterval(() => {
      setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 4000);

    try {
      const domain = normalizeDomain(scanUrl);
      const start = await startFreeScan(domain);

      if (!start.task_id) throw new Error('Could not start scan.');

      pollRef.current = setInterval(async () => {
        try {
          const pollData = await pollScan(start.task_id);

          if (pollData.status === 'completed' && pollData.result) {
            if (pollRef.current) clearInterval(pollRef.current);
            if (scanStepRef.current) clearInterval(scanStepRef.current);
            setIsScanning(false);
            setScanResult({ ...pollData.result, task_id: start.task_id });
            setShowDownloadPrompt(true);
            setTimeout(() => {
              resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          } else if (pollData.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (scanStepRef.current) clearInterval(scanStepRef.current);
            setIsScanning(false);
            setScanError('Scan failed: ' + (pollData.error ?? 'Unknown error'));
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          if (scanStepRef.current) clearInterval(scanStepRef.current);
          setIsScanning(false);
          setScanError('Error polling scan status.');
        }
      }, 3000);
    } catch (err) {
      if (scanStepRef.current) clearInterval(scanStepRef.current);
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to trigger scan. Is the backend running?';
      setIsScanning(false);
      setScanError(message);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-primary flex items-center justify-center">
                {/* SVG Logo from Stitch */}
                <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor"></path>
                  <path clipRule="evenodd" d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.739 8 35.7393 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM4.95178 32.7688L21.4543 6.30267C22.6288 4.4191 25.3712 4.41909 26.5457 6.30267L43.0534 32.777C43.0709 32.8052 43.0878 32.8338 43.104 32.8629L41.3563 33.8352C43.104 32.8629 43.1038 32.8626 43.104 32.8629L43.1051 32.865L43.1065 32.8675L43.1101 32.8739L43.1199 32.8918C43.1276 32.906 43.1377 32.9246 43.1497 32.9473C43.1738 32.9925 43.2062 33.0545 43.244 33.1299C43.319 33.2792 43.4196 33.489 43.5217 33.7317C43.6901 34.1321 44 34.9311 44 35.7391C44 37.4427 43.003 38.7775 41.8558 39.7209C40.6947 40.6757 39.1354 41.4464 37.385 42.0552C33.8654 43.2794 29.133 44 24 44C18.867 44 14.1346 43.2794 10.615 42.0552C8.86463 41.4464 7.30529 40.6757 6.14419 39.7209C4.99695 38.7775 3.99999 37.4427 3.99999 35.7391C3.99999 34.8725 4.29264 34.0922 4.49321 33.6393C4.60375 33.3898 4.71348 33.1804 4.79687 33.0311C4.83898 32.9556 4.87547 32.8935 4.9035 32.8471C4.91754 32.8238 4.92954 32.8043 4.93916 32.7889L4.94662 32.777L4.95178 32.7688ZM35.9868 29.004L24 9.77997L12.0131 29.004C12.4661 28.8609 12.9179 28.7342 13.3617 28.6282C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 34.6383 28.6282C35.082 28.7342 35.5339 28.8609 35.9868 29.004Z" fill="currentColor" fillRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">nxtscan</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#features">Features</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#features">Solutions</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#pricing">Pricing</a>
              <a className="text-sm font-medium hover:text-primary transition-colors" href="#footer">Resources</a>
            </nav>
            <div className="flex items-center gap-4">
              {!user ? (
                <>
                  <Link href="/login" className="hidden sm:inline-flex text-sm font-semibold hover:text-primary">Log in</Link>
                  <Link href="/register" className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50">
                    Get Started
                  </Link>
                </>
              ) : (
                <Link href="/dashboard" className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all">
                  Dashboard
                </Link>
              )}
              <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
              <div className="flex flex-col gap-8">
                <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold leading-6 text-primary ring-1 ring-inset ring-primary/20 self-start">
                  New: AI-Powered Insights 
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
                <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-7xl">
                  Security Intelligence <span className="text-primary">Made Simple</span>
                </h1>
                <p className="text-lg leading-8 text-slate-600 dark:text-slate-400 max-w-xl">
                  The all-in-one platform to analyze your infrastructure, detect vulnerabilities, and instantly generate remediation reports in one unified workspace.
                </p>
                
                {/* Scan Form inside Hero */}
                <div className="w-full relative mt-4">
                  <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        ref={scanInputRef}
                        type="text"
                        value={scanUrl}
                        onChange={(e) => setScanUrl(e.target.value)}
                        className="block w-full pl-10 pr-3 py-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm sm:text-lg h-14"
                        placeholder="Enter your domain (e.g. example.com)"
                        disabled={isScanning}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isScanning}
                      className="h-14 px-8 rounded-xl bg-primary text-white font-bold text-lg shadow-lg hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isScanning ? (
                        <><Activity className="w-5 h-5 animate-spin" /> Scanning</>
                      ) : (
                        <><Shield className="w-5 h-5" /> Free Scan</>
                      )}
                    </button>
                  </form>
                  <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> No credit card required. Results in <span className="font-semibold text-slate-700 dark:text-slate-300">seconds</span>.
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-300"></div>
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-400"></div>
                  </div>
                  <p>Trusted by over 1,000 security teams</p>
                </div>
              </div>

              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-tr from-primary/20 to-purple-500/10 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 overflow-hidden flex flex-col pt-8">
                  <div className="w-full flex-grow bg-slate-100 dark:bg-slate-900 relative rounded-t-xl mx-8 px-6 pt-6 border-x border-t border-slate-200 dark:border-slate-800 text-left">
                    {/* Dynamic View based on Scan status */}
                    {isScanning ? (
                      <div className="flex flex-col h-full items-center justify-center -mt-6">
                        <Activity className="w-12 h-12 text-primary animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Scanning {scanUrl || 'Domain'}</h3>
                        <div className="space-y-3 w-full max-w-sm">
                          {scanSteps.map((step, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                              {i < scanStep ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : i === scanStep ? (
                                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                              )}
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : scanError ? (
                      <div className="flex flex-col h-full items-center justify-center p-6 text-center text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900">
                        <Shield className="w-12 h-12 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Scan Failed</h3>
                        <p>{scanError}</p>
                      </div>
                    ) : scanResult ? (
                      <div ref={resultsRef} className="h-full overflow-y-auto no-scrollbar pb-6 scroll-mt-24">
                        <div className="flex items-center gap-3 mb-6">
                          <ShieldCheck className="w-8 h-8 text-emerald-500" />
                          <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Scan Complete</h2>
                            <p className="text-sm font-mono text-slate-500">{scanResult.domain}</p>
                          </div>
                        </div>
                        {/* AI Remediation */}
                        <div className="mb-6 bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <h4 className="flex items-center gap-2 text-primary font-bold text-sm mb-2"><Sparkles className="w-4 h-4" /> AI Remediation</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 max-h-32 overflow-y-auto pr-2">{scanResult.ai_remediation}</p>
                        </div>
                        {/* Checks */}
                        <div className="grid gap-3 pb-6">
                          {scanResult.scan_data?.slice(0, 3).map((check, i) => (
                            <div key={i} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-slate-900 dark:text-white text-sm">{check.check_name}</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  check.status === 'pass' ? 'bg-emerald-100 text-emerald-700' : check.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{check.status}</span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">{check.detail}</p>
                            </div>
                          ))}
                        </div>
                        {showDownloadPrompt && (
                          <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Want the full bilingual PDF report with all checks and remediation details?
                            </p>
                            <button
                              type="button"
                              onClick={() => window.open(getScanPdfUrl(scanResult.task_id), '_blank', 'noopener,noreferrer')}
                              className="w-full bg-primary text-white text-sm font-bold py-2.5 px-4 rounded-lg shadow inline-flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                            >
                              <FileCheck className="w-4 h-4"/> Download full report
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Abstract Dashboard Representation (Original design)
                      <div className="w-full h-full relative">
                        <div className="flex gap-4 mb-8">
                          <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
                          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full ml-auto"></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="h-24 bg-primary/5 rounded-lg border border-primary/20 p-4 flex flex-col justify-between">
                            <div className="h-4 w-16 bg-primary/30 rounded"></div>
                            <div className="h-8 w-24 bg-primary/20 rounded"></div>
                          </div>
                          <div className="h-24 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between">
                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                          </div>
                        </div>
                        <div className="h-32 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                          <div className="space-y-2">
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
                            <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Decorative elements */}
                <div className="absolute -z-10 -top-10 -right-10 size-64 bg-primary/20 blur-3xl rounded-full"></div>
                <div className="absolute -z-10 -bottom-10 -left-10 size-64 bg-purple-500/20 blur-3xl rounded-full"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-12 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">Integrated with Industry Standard Tools</p>
          <div className="flex gap-16 opacity-60 grayscale items-center text-slate-800 dark:text-slate-300 w-max hover:grayscale-0 hover:opacity-100 transition-all duration-500 mx-auto px-4 overflow-x-auto max-w-7xl">
            {trustLogos.map((logo, i) => (
              <div key={i} className="flex items-center gap-3 text-lg font-bold shrink-0">
                {logo.icon} {logo.name}
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="features" className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-4">Capabilities</h2>
              <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6">Complete Security Posture</h3>
              <p className="text-lg text-slate-600 dark:text-slate-400">Our suite of tools is designed to help you scan, track, and remediate vulnerabilities faster than ever.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <div key={i} className="group p-8 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all shadow-sm hover:shadow-xl">
                  <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{feature.title}</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Flexible Pricing Plans</h2>
              <p className="text-slate-600 dark:text-slate-400">Choose the perfect plan for your stage of growth.</p>
              {/* Toggle */}
              <div className="mt-8 flex justify-center items-center gap-4">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Simple, transparent pricing.</span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/30">
                  Open source core, SaaS add‑ons
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Free */}
              <div className="flex flex-col p-8 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Free</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$0</span>
                  <span className="text-slate-500 text-sm">/mo</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">Ideal for testing the platform or running occasional manual scans.</p>
                <ul className="flex-grow space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> On‑demand scans
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> SSL & header analysis
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Basic PDF report (EN/AR)
                  </li>
                </ul>
                <button className="w-full py-3 px-4 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 transition-colors">
                  Start Free
                </button>
              </div>
              
              {/* Professional (Featured) */}
              <div className="flex flex-col p-8 rounded-2xl bg-primary text-white shadow-xl relative scale-105 z-10">
                <div className="absolute top-0 right-8 transform -translate-y-1/2 bg-indigo-400 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Most Popular</div>
                <h3 className="text-lg font-bold mb-2">Professional</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black">$5</span>
                  <span className="text-white/70 text-sm">/mo</span>
                </div>
                <p className="text-white/80 text-sm mb-8">Best for growing teams that need automated monitoring and AI insights on a budget.</p>
                <ul className="flex-grow space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-white/90">
                    <CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Automated weekly scans
                  </li>
                  <li className="flex items-center gap-3 text-sm text-white/90">
                    <CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> AI‑powered remediation insights
                  </li>
                  <li className="flex items-center gap-3 text-sm text-white/90">
                    <CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Real‑time email alerts
                  </li>
                  <li className="flex items-center gap-3 text-sm text-white/90">
                    <CheckCircle2 className="text-white w-5 h-5 flex-shrink-0" /> Full scan history for 12 months
                  </li>
                </ul>
                <button className="w-full py-3 px-4 rounded-xl bg-white text-primary font-bold hover:bg-slate-50 transition-all shadow-md">
                  Upgrade to Professional
                </button>
              </div>
              
              {/* Enterprise */}
              <div className="flex flex-col p-8 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Enterprise</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$49</span>
                  <span className="text-slate-500 text-sm">/mo</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-8">For security teams that need advanced reporting, SLAs, and integrations.</p>
                <ul className="flex-grow space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Everything in Professional
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Unlimited projects & domains
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Full API access & webhooks
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="text-primary w-5 h-5 flex-shrink-0" /> Dedicated support & SLAs
                  </li>
                </ul>
                <button className="w-full py-3 px-4 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 transition-colors">
                  Talk to Sales
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="bg-primary rounded-3xl p-12 text-center text-white overflow-hidden relative">
              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl font-black mb-6">Ready to secure your infrastructure?</h2>
                <p className="text-lg text-indigo-100 mb-10">Start scanning today. Run a free instant network analysis in seconds.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="px-8 py-4 bg-white text-primary rounded-xl font-bold text-lg shadow-xl hover:bg-slate-50 transition-all flex justify-center items-center gap-2">
                    <ScanLine className="w-5 h-5" /> Run Free Scan
                  </button>
                  <Link href="/register" className="px-8 py-4 bg-indigo-800/50 border border-white/20 text-white rounded-xl font-bold text-lg flex items-center justify-center hover:bg-indigo-800/70 transition-all">
                    Create Account
                  </Link>
                </div>
              </div>
              {/* Abstract Background Decor */}
              <div className="absolute -top-24 -left-24 size-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 -right-24 size-96 bg-slate-100/10 rounded-full blur-3xl"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="footer" className="bg-white dark:bg-slate-950 pt-20 pb-10 border-t border-slate-200 dark:border-slate-800 w-full mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="text-primary">
                  <svg className="size-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13.8261 30.5736C16.7203 29.8826 20.2244 29.4783 24 29.4783C27.7756 29.4783 31.2797 29.8826 34.1739 30.5736C36.9144 31.2278 39.9967 32.7669 41.3563 33.8352L24.8486 7.36089C24.4571 6.73303 23.5429 6.73303 23.1514 7.36089L6.64374 33.8352C8.00331 32.7669 11.0856 31.2278 13.8261 30.5736Z" fill="currentColor"></path>
                    <path clipRule="evenodd" d="M39.998 35.764C39.9944 35.7463 39.9875 35.7155 39.9748 35.6706C39.9436 35.5601 39.8949 35.4259 39.8346 35.2825C39.8168 35.2403 39.7989 35.1993 39.7813 35.1602C38.5103 34.2887 35.9788 33.0607 33.7095 32.5189C30.9875 31.8691 27.6413 31.4783 24 31.4783C20.3587 31.4783 17.0125 31.8691 14.2905 32.5189C12.0012 33.0654 9.44505 34.3104 8.18538 35.1832C8.17384 35.2075 8.16216 35.233 8.15052 35.2592C8.09919 35.3751 8.05721 35.4886 8.02977 35.589C8.00356 35.6848 8.00039 35.7333 8.00004 35.7388C8.00004 35.739 8 35.7393 8.00004 35.7388C8.00004 35.7641 8.0104 36.0767 8.68485 36.6314C9.34546 37.1746 10.4222 37.7531 11.9291 38.2772C14.9242 39.319 19.1919 40 24 40C28.8081 40 33.0758 39.319 36.0709 38.2772C37.5778 37.7531 38.6545 37.1746 39.3151 36.6314C39.9006 36.1499 39.9857 35.8511 39.998 35.764ZM4.95178 32.7688L21.4543 6.30267C22.6288 4.4191 25.3712 4.41909 26.5457 6.30267L43.0534 32.777C43.0709 32.8052 43.0878 32.8338 43.104 32.8629L41.3563 33.8352C43.104 32.8629 43.1038 32.8626 43.104 32.8629L43.1051 32.865L43.1065 32.8675L43.1101 32.8739L43.1199 32.8918C43.1276 32.906 43.1377 32.9246 43.1497 32.9473C43.1738 32.9925 43.2062 33.0545 43.244 33.1299C43.319 33.2792 43.4196 33.489 43.5217 33.7317C43.6901 34.1321 44 34.9311 44 35.7391C44 37.4427 43.003 38.7775 41.8558 39.7209C40.6947 40.6757 39.1354 41.4464 37.385 42.0552C33.8654 43.2794 29.133 44 24 44C18.867 44 14.1346 43.2794 10.615 42.0552C8.86463 41.4464 7.30529 40.6757 6.14419 39.7209C4.99695 38.7775 3.99999 37.4427 3.99999 35.7391C3.99999 34.8725 4.29264 34.0922 4.49321 33.6393C4.60375 33.3898 4.71348 33.1804 4.79687 33.0311C4.83898 32.9556 4.87547 32.8935 4.9035 32.8471C4.91754 32.8238 4.92954 32.8043 4.93916 32.7889L4.94662 32.777L4.95178 32.7688ZM35.9868 29.004L24 9.77997L12.0131 29.004C12.4661 28.8609 12.9179 28.7342 13.3617 28.6282C16.4281 27.8961 20.0901 27.4783 24 27.4783C27.9099 27.4783 31.5719 27.8961 34.6383 28.6282C35.082 28.7342 35.5339 28.8609 35.9868 29.004Z" fill="currentColor" fillRule="evenodd"></path>
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">nxtscan</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 max-w-xs mb-8">Empowering businesses to secure their infrastructure with intelligent analysis tools.</p>
              <div className="flex gap-4">
                <a
                  className="text-slate-400 hover:text-primary transition-colors"
                  href="https://nxtlab-v1.vercel.app/"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe className="w-5 h-5"/>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <li><a className="hover:text-primary transition-colors" href="#features">Features</a></li>
                <li><a className="hover:text-primary transition-colors" href="#features">Integrations</a></li>
                <li><a className="hover:text-primary transition-colors" href="#pricing">Pricing</a></li>
                <li><Link className="hover:text-primary transition-colors" href="/changelog">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <a
                    className="hover:text-primary transition-colors"
                    href="https://nxtlab-v1.vercel.app/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Company
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-primary transition-colors"
                    href="https://nxtlab-v1.vercel.app/#services"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Services
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-primary transition-colors"
                    href="https://nxtlab-v1.vercel.app/#about"
                    target="_blank"
                    rel="noreferrer"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-primary transition-colors"
                    href="https://nxtlab-v1.vercel.app/#contact"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
                <li><Link className="hover:text-primary transition-colors" href="/help">Help Center</Link></li>
                <li><Link className="hover:text-primary transition-colors" href="/docs">Documentation</Link></li>
                <li><Link className="hover:text-primary transition-colors" href="/security">Security</Link></li>
                <li><Link className="hover:text-primary transition-colors" href="/privacy">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2026 nxtscan. All rights reserved.</p>
            <div className="flex gap-8">
              <Link className="hover:text-primary transition-colors" href="/privacy">Privacy Policy</Link>
              <Link className="hover:text-primary transition-colors" href="/terms">Terms of Service</Link>
              <Link className="hover:text-primary transition-colors" href="/cookies">Cookie Settings</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
