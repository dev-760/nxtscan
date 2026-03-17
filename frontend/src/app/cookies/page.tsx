'use client';

export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
        Cookie Settings
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        nxtscan uses a minimal set of cookies. Update this content with your final cookie policy
        and controls.
      </p>
      <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Essential Cookies
          </h2>
          <p>
            These cookies are required for authentication and basic functionality. They cannot be
            disabled without impacting the service.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">
            Analytics
          </h2>
          <p>
            We may use privacy-friendly analytics to understand aggregate usage. No marketing
            tracking pixels are used within the dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}

