'use client';

export default function DocumentationPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Documentation
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        High-level documentation for using nxtscan in production. For deeper integration details,
        refer to the backend and frontend READMEs in the repository.
      </p>
      <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Plans & Limits
          </h2>
          <p>
            The Free plan supports on-demand scans via the homepage. Professional and Enterprise
            plans unlock automated weekly scans, email alerts, and extended history for monitored
            domains you add in the dashboard.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Data Sources
          </h2>
          <p>
            nxtscan combines SSL inspection, header checks, DNS lookups, optional Shodan data, and
            AI analysis to produce findings and remediation guidance. No credentials to your
            systems are stored.
          </p>
        </section>
      </div>
    </div>
  );
}

