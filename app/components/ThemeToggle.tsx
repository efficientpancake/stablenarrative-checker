"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  // null until mounted, so server + first client render match (no hydration flash)
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      setTheme(prefersLight ? "light" : "dark");
    }
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage blocked — theme still applies for this session */
    }
  }

  if (!theme) return null;

  // Icon + label both name the destination, so the control is self-explanatory.
  const target = theme === "dark" ? "light" : "dark";
  const icon = theme === "dark" ? "☀" : "☾";
  const label = theme === "dark" ? "Light" : "Dark";

  return (
    <button
      className="ghost theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${target} mode`}
      title={`Switch to ${target} mode`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  );
}
