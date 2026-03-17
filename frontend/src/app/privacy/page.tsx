'use client';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Privacy
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        High-level information about how nxtscan handles your data. Adapt this page to match your
        final legal wording.
      </p>
      <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Data Collected
          </h2>
          <p>
            We store account email addresses, monitored domains, scan results, and generated
            reports. We do not collect credentials to your infrastructure or third-party accounts.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Usage & Retention
          </h2>
          <p>
            Data is used solely to provide scanning, reporting, and alerting features. Scan history
            retention depends on your plan; you can request deletion of your account and associated
            data at any time.
          </p>
        </section>
      </div>
    </div>
  );
}

