import { Link } from 'react-router-dom';

export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="neyomi-mark" x1="8" y1="7" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#b92824" />
          <stop offset=".55" stopColor="#dc3f35" />
          <stop offset="1" stopColor="#e5682e" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="52" height="52" rx="15" fill="url(#neyomi-mark)" />
      <path
        d="M21 46V18l22 28V18"
        fill="none"
        stroke="white"
        strokeWidth="5.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({
  compact = false,
  link = false,
  className = '',
}: {
  compact?: boolean;
  link?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <BrandMark className={compact ? 'h-8 w-8' : 'h-10 w-10'} />
      <span className={`${compact ? 'text-lg' : 'text-xl'} font-extrabold tracking-[-0.025em] text-white`}>
        Neyomi
      </span>
    </>
  );

  const classes = `inline-flex items-center gap-2 ${className}`;
  return link ? (
    <Link to="/" className={classes} aria-label="Neyomi home">
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}
