"use client";

import { useEffect } from "react";

/**
 * Fades each [data-reveal] element in once, as it scrolls into view.
 *
 * Content is only hidden after this runs (it adds `reveal-ready` to <html>),
 * so without JavaScript every section simply shows. Visitors who set their
 * computer to reduce motion get no animation at all.
 */
export default function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observer.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    // Anything already on screen shows straight away rather than blinking out.
    const inView = (el: HTMLElement) => el.getBoundingClientRect().top < window.innerHeight;
    targets.forEach((el) => (inView(el) ? el.classList.add("revealed") : observer.observe(el)));
    root.classList.add("reveal-ready");

    return () => {
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
