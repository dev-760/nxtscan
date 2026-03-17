'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShieldCheck, Sparkles, ArrowRight, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { startUpgradeCheckout, openBillingPortal } from '@/lib/billing';

type Plan = 'free' | 'pro' | 'agency';

export default function SettingsPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('users')
        .select('plan')
        .eq('id', user.id)
        .single();

      if (data?.plan) {
        setPlan(data.plan);
      }
      setLoading(false);
    };

    loadProfile();
  }, []);

  const humanPlan =
    plan === 'pro' ? 'Professional' : plan === 'agency' ? 'Enterprise' : 'Free';

  const handleUpgrade = async (target: 'pro' | 'enterprise') => {
    try {
      setError(null);
      setBillingLoading(true);
      await startUpgradeCheckout(target);
    } catch (err) {
      setBillingLoading(false);
      setError(
        err instanceof Error ? err.message : 'Could not start billing flow. Please try again.',
      );
    }
  };

  const handleOpenPortal = async () => {
    try {
      setError(null);
      setBillingLoading(true);
      await openBillingPortal();
    } catch (err) {
      setBillingLoading(false);
      setError(
        err instanceof Error ? err.message : 'Could not open billing portal. Please try again.',
      );
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-400" />
            Account & Billing
          </h1>
          <p className="text-secondary text-sm md:text-base mt-1">
            Manage your subscription, billing details, and upgrade plan.
          </p>
        </div>
      </div>

      {/* Current plan card */}
      <div className="glass-strong rounded-3xl p-6 md:p-8 border border-white/10 flex flex-col md:flex-row gap-6 md:items-center">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-secondary font-semibold mb-2">
            Current plan
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 border border-white/10 px-4 py-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-primary">
              {loading ? 'Loading…' : humanPlan}
            </span>
          </div>
          <p className="text-secondary text-sm max-w-md">
            {plan === 'agency'
              ? 'You are on the highest tier with unlimited domains, full API access, and priority support.'
              : 'Upgrade to unlock automated weekly scans, AI remediation at scale, and advanced reporting.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          {plan && plan !== 'agency' && (
            <button
              onClick={() => handleUpgrade(plan === 'free' ? 'pro' : 'enterprise')}
              disabled={billingLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-white px-5 py-3 text-sm font-semibold transition-all btn-premium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {plan === 'free' ? 'Upgrade to Professional' : 'Upgrade to Enterprise'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {plan && plan !== 'free' && (
            <button
              onClick={handleOpenPortal}
              disabled={billingLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 hover:border-white/20 bg-slate-900/60 text-secondary hover:text-primary px-5 py-3 text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              Manage billing & invoices
            </button>
          )}
        </div>
      </div>

      {/* Plan comparison */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-[0.18em]">
            Plans overview
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="glass-surface rounded-2xl p-5 border border-white/5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary mb-1">
              Free
            </p>
            <p className="text-lg font-bold text-primary mb-3">$0 / month</p>
            <ul className="space-y-2 text-xs text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                On-demand manual scans
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Basic PDF reports
              </li>
            </ul>
          </div>
          <div className="glass-surface rounded-2xl p-5 border border-brand-500/40 relative">
            <div className="absolute -top-3 right-4 text-[10px] px-2 py-0.5 rounded-full bg-brand-500 text-white font-semibold tracking-wide">
              Popular
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary mb-1">
              Professional
            </p>
            <p className="text-lg font-bold text-primary mb-3">$5 / month</p>
            <ul className="space-y-2 text-xs text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Automated weekly scans
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                AI remediation & email alerts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                12-month scan history
              </li>
            </ul>
          </div>
          <div className="glass-surface rounded-2xl p-5 border border-indigo-500/40">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-secondary mb-1">
              Enterprise
            </p>
            <p className="text-lg font-bold text-primary mb-3">$49 / month</p>
            <ul className="space-y-2 text-xs text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Unlimited domains & projects
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Full API access & webhooks
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Priority support & SLAs
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="glass-strong rounded-2xl p-4 border border-red-500/40 flex items-start gap-3 text-sm text-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <p className="flex-1">{error}</p>
        </div>
      )}
    </div>
  );
}

