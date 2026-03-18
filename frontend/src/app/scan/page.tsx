'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  FileCheck,
  Globe,
  AlertTriangle,
  ArrowLeft,
  Server,
  Lock,
  Search,
  Zap,
  ChevronRight,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getScanPdfUrl,
  pollScan,
  ScanCheck,
  startFreeScan,
} from '@/lib/api';

const scanSteps = [
  'Resolving DNS records and identifying infrastructure...',
  'Validating SSL/TLS certificates and encryption protocols...',
  'Analyzing HTTP security headers and misconfigurations...',
  'Scanning for open ports and exposed services...',
  'Checking threat intelligence and data breach records...',
  'Synthesizing data and generating AI remediation report...',
];

interface ScanResultViewModel {
  task_id: string;
  domain: string;
  ai_remediation: string;
  scan_data?: ScanCheck[];
}

function ScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDomain = searchParams.get('domain');

  const [scanResult, setScanResult] = useState<ScanResultViewModel | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanStep, setScanStep] = useState(0);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const scanStepRef = useRef<NodeJS.Timeout | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (scanStepRef.current) clearInterval(scanStepRef.current);
    };
  }, []);

  useEffect(() => {
    if (!initialDomain || hasStartedRef.current) return;
    
    const runScan = async () => {
      hasStartedRef.current = true;
      setIsScanning(true);
      setScanResult(null);
      setScanError(null);
      setScanStep(0);

      scanStepRef.current = setInterval(() => {
        setScanStep((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
      }, 3500);

      try {
        const start = await startFreeScan(initialDomain);

        if (!start.task_id) throw new Error('Could not initialize scan sequence.');

        pollRef.current = setInterval(async () => {
          try {
            const pollData = await pollScan(start.task_id);

            if (pollData.status === 'completed' && pollData.result) {
              if (pollRef.current) clearInterval(pollRef.current);
              if (scanStepRef.current) clearInterval(scanStepRef.current);
              setScanStep(scanSteps.length); // Complete all steps visually
              
              setTimeout(() => {
                setIsScanning(false);
                setScanResult({
                  task_id: start.task_id,
                  domain: pollData.result?.domain || initialDomain,
                  ai_remediation: pollData.result?.ai_remediation || 'No remediation data provided.',
                  scan_data: pollData.result?.scan_data
                });
              }, 1000);
            } else if (pollData.status === 'failed') {
              if (pollRef.current) clearInterval(pollRef.current);
              if (scanStepRef.current) clearInterval(scanStepRef.current);
              setIsScanning(false);
              setScanError('Scan execution failed: ' + (pollData.error ?? 'Unknown error occurred.'));
            }
          } catch {
            if (pollRef.current) clearInterval(pollRef.current);
            if (scanStepRef.current) clearInterval(scanStepRef.current);
            setIsScanning(false);
            setScanError('Error polling scan status from the backend.');
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

    runScan();
  }, [initialDomain]);

  if (!initialDomain) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <AlertTriangle className="w-16 h-16 text-amber-500/50 mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">No Target Specified</h2>
        <p className="mb-8">Please return to the landing page and enter a valid domain to scan.</p>
        <button onClick={() => router.push('/')} className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-600 transition-all">
          <ArrowLeft className="w-4 h-4" /> Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Target Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-[#0f1014]/80 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shrink-0"
      >
        <div>
          <div className="flex items-center gap-3 text-sm text-slate-400 mb-2 font-medium">
            <Link href="/" className="hover:text-brand-400 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Threat Intelligence Scan</span>
          </div>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${isScanning ? 'bg-blue-500/10 border-blue-500/30' : scanError ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} flex-shrink-0`}>
              {isScanning ? <Globe className="w-6 h-6 text-blue-400 animate-pulse" /> : scanError ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-mono">{initialDomain}</h1>
              <p className="text-sm font-medium text-slate-400 flex items-center gap-2 mt-1">
                {isScanning ? (
                  <><span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span> Scanning Infrastructure...</>
                ) : scanError ? (
                  <><span className="w-2 h-2 rounded-full bg-red-500"></span> Scan Failed</>
                ) : (
                  <><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span> Analysis Complete</>
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {isScanning && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ duration: 0.5 }}
            className="w-full relative"
          >
            {/* Holographic Radar Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="max-w-2xl mx-auto bg-[#15161A]/80 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-10 md:p-14 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-12">
                  <div className="w-24 h-24 rounded-full border-4 border-white/5 border-t-brand-500 border-l-brand-400 animate-spin flex items-center justify-center"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-brand-400" />
                  </div>
                </div>

                <div className="w-full space-y-5">
                  {scanSteps.map((step, i) => {
                    const isActive = i === scanStep;
                    const isCompleted = i < scanStep;
                    const isPending = i > scanStep;

                    return (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${
                          isActive ? 'bg-brand-500/10 border-brand-500/30 shadow-[0_0_30px_rgba(139,92,246,0.1)]' : 
                          isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 
                          'bg-white/[0.02] border-white/5 opacity-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                          isActive ? 'border-brand-500 text-brand-400 bg-brand-500/20 shadow-[0_0_15px_rgba(139,92,246,0.4)]' : 
                          isCompleted ? 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10' : 
                          'border-white/10 text-slate-500 bg-black/20'
                        }`}>
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : isActive ? <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></div> : <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>}
                        </div>
                        <span className={`text-sm md:text-base font-medium ${isActive ? 'text-white' : isCompleted ? 'text-slate-300' : 'text-slate-500'}`}>
                          {step}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {scanError && !isScanning && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-red-950/20 backdrop-blur-xl border border-red-500/20 rounded-[2rem] p-12 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Analysis Failed</h2>
            <p className="text-slate-400 mb-8">{scanError}</p>
            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-xl font-bold transition-all">
              Retry Scan
            </button>
          </motion.div>
        )}

        {scanResult && !isScanning && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="w-full space-y-8 pb-20"
          >
            {/* AI Remediation Intelligence */}
            <div className="bg-gradient-to-br from-brand-900/30 to-[#15161A] border border-brand-500/20 rounded-[2rem] p-8 md:p-10 shadow-[0_0_50px_rgba(139,92,246,0.05)] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none mix-blend-screen">
                  <Sparkles className="w-64 h-64 text-brand-400" />
               </div>
               <div className="relative z-10 max-w-4xl">
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-bold uppercase tracking-widest mb-6">
                    <Sparkles className="w-4 h-4" /> AI Threat Intel
                 </div>
                 <h2 className="text-3xl font-black text-white mb-6">Executive Summary & Remediation</h2>
                 <div className="prose prose-invert prose-brand max-w-none text-slate-300 text-lg leading-relaxed bg-black/20 p-6 md:p-8 rounded-2xl border border-white/5">
                    {scanResult.ai_remediation.split('\n').map((paragraph, idx) => (
                      <p key={idx} className="mb-4 last:mb-0">{paragraph}</p>
                    ))}
                 </div>
               </div>
            </div>

            {/* Individual Security Checks */}
            <div>
              <div className="flex items-center justify-between mb-6 px-2">
                 <h3 className="text-xl font-bold text-white flex items-center gap-2"><Search className="w-5 h-5 text-slate-400" /> Raw Security Checks</h3>
                 <span className="text-sm font-medium text-slate-500">{scanResult.scan_data?.length || 0} checks completed</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {scanResult.scan_data?.map((check, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="bg-[#15161A] border border-white/5 p-6 rounded-2xl hover:border-white/15 transition-colors group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">{check.check_name}</h4>
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ml-3 ${
                        check.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        check.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mt-auto">{check.detail}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Ultimate Call to Action: The PDF Report */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
              className="mt-12 bg-gradient-to-r from-blue-600/20 via-brand-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] p-1 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-brand-500 to-purple-500 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-700"></div>
              <div className="bg-[#0a0a0b]/90 backdrop-blur-2xl rounded-[2.4rem] p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10 text-center md:text-left">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-brand-400 font-bold tracking-widest uppercase text-xs mb-4">
                    <Lock className="w-4 h-4" /> Secure your infrastructure
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-white mb-4">Download Full Bilingual PDF Report</h3>
                  <p className="text-slate-400 text-lg">Includes highly detailed vulnerability tracking, historical context, and dedicated remediation steps. Create a free account to download the report and enable continuous monitoring.</p>
                </div>
                <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto">
                  <Link href="/register" className="btn-premium px-8 py-5 rounded-2xl flex items-center justify-center gap-3 w-full bg-brand-500 text-white font-bold text-lg hover:scale-105 transition-transform">
                    <Download className="w-6 h-6" /> Extract Report
                  </Link>
                  <p className="text-xs text-slate-500 text-center tracking-wide font-medium">Free forever. No credit card required.</p>
                </div>
              </div>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-200 font-sans selection:bg-brand-500/30 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-30 bg-[#050507]" />
      <div className="fixed inset-0 -z-25 noise-overlay pointer-events-none" />
      <div className="fixed inset-0 -z-20 mesh-gradient pointer-events-none" />
      
      {/* Simple Header */}
      <header className="fixed top-0 left-0 right-0 h-20 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-2xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-white group-hover:text-brand-300 transition-colors">NxtScan</span>
          </Link>
          <div className="flex gap-4">
             <Link href="/login" className="px-5 py-2 rounded-lg text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all">Log In</Link>
             <Link href="/register" className="px-5 py-2 bg-white text-black hover:bg-slate-200 rounded-lg text-sm font-bold shadow-xl transition-all">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Main Content Space */}
      <main className="pt-32 pb-20 px-6 min-h-screen flex items-start justify-center">
        <Suspense fallback={
          <div className="w-full flex justify-center mt-32">
             <Activity className="w-12 h-12 text-brand-500 animate-spin" />
          </div>
        }>
          <ScanContent />
        </Suspense>
      </main>
    </div>
  );
}
