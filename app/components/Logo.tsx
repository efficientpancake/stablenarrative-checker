import Link from "next/link";

// The wordmark. A single rounded "compliance check" mark carries the accent;
// the word itself stays high-contrast neutral so it reads as a considered brand,
// not accent-colored text. Inline SVG so it inherits the theme tokens and needs
// no asset request. It links home to the landing page, so a tester inside the
// checker always has a way back to the front of the site.
export default function Logo() {
  return (
    <Link href="/" className="logo" aria-label="StableNarrative home">
      <svg
        className="logo-mark"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect width="24" height="24" rx="7" fill="var(--accent)" />
        <path
          d="M6.5 12.4l3.4 3.4L17.6 8"
          stroke="var(--accent-text)"
          strokeWidth="2.3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="logo-word" aria-hidden="true">
        StableNarrative
      </span>
    </Link>
  );
}
