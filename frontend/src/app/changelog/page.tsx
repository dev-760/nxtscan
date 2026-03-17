'use client';

export default function ChangelogPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Changelog
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-10">
        A brief summary of recent improvements to nxtscan.
      </p>
      <div className="space-y-8 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Dashboard & Billing
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>New plan-aware dashboard header with upgrade CTAs.</li>
            <li>Added billing settings page with Stripe checkout and portal integration.</li>
            <li>Improved domain cards with clearer statuses and actions.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Scanning Experience
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Refined the free scan flow to show AI remediation and key checks.</li>
            <li>Prompt users to download the full bilingual PDF report after each scan.</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            UI & Marketing Site
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Modernized auth screens and marketing layout with a consistent design system.</li>
            <li>Linked company information to the main nxtlab site.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

