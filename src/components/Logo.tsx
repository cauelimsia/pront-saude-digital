import Link from "next/link";

export function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const textColor = variant === "light" ? "text-white" : "text-ink-900";
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <path
            d="M12 21s-7-4.35-9.33-9.06C1.1 8.6 2.7 5 6.2 5c2 0 3.2 1.1 3.8 2.2C10.6 6.1 11.8 5 13.8 5c3.5 0 5.1 3.6 3.53 6.94C19 16.65 12 21 12 21Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span className={`text-xl font-extrabold tracking-tight ${textColor}`}>
        Pront<span className="text-brand-500">.</span>
      </span>
    </Link>
  );
}
