import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Official Inter (rsms, inter-ui 4.1.1, OFL), self-hosted. Not Google Fonts'
// copy: Google's build strips the character variants we rely on. With the
// official file, globals.css switches on cv08 (capital I with crossbars) and
// cv05 (lowercase l with a tail) so look-alike letters stay distinct for
// dyslexic readers and in rule citations like "COBS 4.12A.11R". See DESIGN.md.
const inter = localFont({
  src: "./fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StableNarrative FCA Compliance Checker",
  description:
    "Grammarly for FCA compliance. Paste UK crypto marketing copy and check it against FCA financial-promotion rules before it reaches your s21 approver.",
};

// Runs before first paint: applies a stored theme choice so there's no flash.
// Light is the default; dark applies only if the user chose it.
const noFlashScript = `
(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        {children}
      </body>
    </html>
  );
}
