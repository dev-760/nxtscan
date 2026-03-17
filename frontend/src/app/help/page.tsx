'use client';

export default function HelpCenterPage() {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Help Center
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Short answers to common questions about scanning, reports, and accounts.
      </p>
      <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            How do I run a scan?
          </h2>
          <p>
            From the homepage, enter a domain such as <code>example.com</code> and click
            &nbsp;<strong>Free Scan</strong>. From the dashboard, add a domain to your perimeter
            and trigger a scan at any time.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Where do I find my reports?
          </h2>
          <p>
            After a scan completes you&apos;ll see AI remediation and key checks in the UI, along
            with a prompt to download the full bilingual PDF report. You can also access reports
            from emailed links if you&apos;re on a paid plan.
          </p>
        </section>
      </div>
    </div>
  );
}

