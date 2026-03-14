export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-0.5 select-none ${className}`}>
      {/* Shield icon mark */}
      <div className="relative mr-1.5">
        <svg
          className="w-8 h-8 text-brand-500"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 2L4 8V15C4 22.18 9.12 28.84 16 30C22.88 28.84 28 22.18 28 15V8L16 2Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11 16L14.5 19.5L21 13"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Wordmark */}
      <span className="text-white font-extrabold text-2xl tracking-tight leading-none">
        next
      </span>
      <span className="text-brand-500 font-extrabold text-2xl tracking-tight leading-none">
        lab
      </span>

      {/* Sparkle dot */}
      <span className="relative -top-2 -ml-0.5">
        <span className="block w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-ring" />
      </span>
    </div>
  );
}
