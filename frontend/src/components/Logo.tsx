import Image from 'next/image';

export function Logo({ className = '', size = 'default' }: { className?: string; size?: 'small' | 'default' | 'large' }) {
  const sizes = {
    small: { width: 100, height: 20 },
    default: { width: 130, height: 26 },
    large: { width: 160, height: 32 },
  };

  const { width, height } = sizes[size];

  return (
    <div className={`flex items-center select-none ${className}`}>
      <Image
        src="/logo.svg"
        alt="NextLab"
        width={width}
        height={height}
        className="h-auto"
        priority
      />
    </div>
  );
}
