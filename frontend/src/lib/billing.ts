import { createClient } from '@/utils/supabase/client';
import { request } from '@/lib/api';

export type PlanSlug = 'free' | 'pro' | 'enterprise';

export async function startUpgradeCheckout(plan: PlanSlug) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You need to be logged in to manage billing.');
  }

  const res = await request<{ url: string }>(
    `/billing/checkout?plan=${encodeURIComponent(plan === 'enterprise' ? 'enterprise' : 'pro')}`,
    { method: 'POST', authToken: session.access_token },
  );

  if (!res.url) {
    throw new Error('Billing session could not be created.');
  }

  window.location.href = res.url;
}

export async function openBillingPortal() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You need to be logged in to manage billing.');
  }

  const res = await request<{ url: string }>(
    '/billing/portal',
    { method: 'POST', authToken: session.access_token },
  );

  if (!res.url) {
    throw new Error('Billing portal could not be opened.');
  }

  window.location.href = res.url;
}

