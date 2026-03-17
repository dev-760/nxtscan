'use client';

export default function SecurityPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Security
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        An overview of how nxtscan handles security for data in transit, data at rest, and
        operational access.
      </p>
      <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Data in Transit & At Rest
          </h2>
          <p>
            All communication between your browser, the API, and Supabase uses TLS. Scan data and
            reports are stored in Supabase/PostgreSQL and object storage with encryption at rest
            provided by the underlying platform.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Access & Authentication
          </h2>
          <p>
            Dashboard access is gated through Supabase Auth. Row-level security (RLS) ensures that
            users can only access their own domains, scans, and alerts.
          </p>
        </section>
      </div>
    </div>
  );
}

