'use client';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Terms of Service
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Lightweight placeholder terms. Replace this content with your final, jurisdiction-specific
        legal text.
      </p>
      <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Acceptable Use
          </h2>
          <p>
            You are responsible for ensuring you have authorization to scan any domain you add to
            nxtscan. Do not use the service to scan infrastructure you do not control or have legal
            permission to assess.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Service Availability
          </h2>
          <p>
            While we aim for high availability, nxtscan is provided on a best-effort basis. We may
            perform maintenance or update the service without prior notice.
          </p>
        </section>
      </div>
    </div>
  );
}

