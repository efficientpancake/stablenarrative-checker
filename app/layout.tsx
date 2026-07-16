import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StableNarrative FCA Compliance Checker",
  description:
    "Grammarly for FCA compliance. Paste UK crypto marketing copy and check it against FCA financial-promotion rules before it reaches your s21 approver.",
};

// Runs before first paint: applies a stored theme choice so there's no flash.
// If the user hasn't chosen, we leave data-theme unset and CSS follows the OS.
const noFlashScript = `
(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        {children}
      </body>
    </html>
  );
}
