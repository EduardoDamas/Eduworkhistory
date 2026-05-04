import Link from "next/link";

export function BrandLogo({
  href = "/",
  className = "",
  inverted = false,
}: {
  href?: string;
  className?: string;
  /** White wordmark for dark backgrounds (e.g. marketing header). */
  inverted?: boolean;
}) {
  const wordmark = inverted ? "text-white" : "text-slate-900";
  const ringOffset = inverted ? "focus:ring-offset-4 focus:ring-offset-[#0b0e14]" : "focus:ring-offset-2";
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={`text-lg font-bold tracking-tight ${wordmark}`}>OrderFlow</span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand ${ringOffset} ${className}`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={`inline-flex items-center gap-2 ${className}`}>{inner}</div>;
}
