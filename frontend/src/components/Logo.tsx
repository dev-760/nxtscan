export function Logo({ className = "" }: { className?: string }) {
    return (
        <div className={`flex items-center space-x-0 ${className}`}>
            {/* "n" */}
            <span className="text-white font-bold text-3xl tracking-tight">n</span>

            {/* "e" looking like a link icon in violet */}
            <svg
                className="text-brand-500 w-8 h-8 -mt-[0.2rem] mx-[-0.1rem]"
                viewBox="0 0 40 40"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M12.5 15C10.0147 15 8 17.0147 8 19.5C8 21.9853 10.0147 24 12.5 24H18V28.5H12.5C7.52944 28.5 3.5 24.4706 3.5 19.5C3.5 14.5294 7.52944 10.5 12.5 10.5H18V15H12.5Z" />
                <path d="M22 15H27.5C29.9853 15 32 17.0147 32 19.5C32 21.9853 29.9853 24 27.5 24H22V28.5H27.5C32.4706 28.5 36.5 24.4706 36.5 19.5C36.5 14.5294 32.4706 10.5 27.5 10.5H22V15Z" />
                <rect x="14" y="17.25" width="12" height="4.5" rx="2.25" />
            </svg>

            {/* "xt" */}
            <span className="text-white font-bold text-3xl tracking-tight">xt</span>

            {/* "lab" with star overhead */}
            <div className="relative text-brand-500 font-bold text-3xl tracking-tight ml-[2px]">
                {/* Four pointed star above 'l' */}
                <svg
                    className="absolute -top-4 -left-1 w-4 h-4 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0Z" />
                </svg>
                lab
            </div>
        </div>
    );
}
