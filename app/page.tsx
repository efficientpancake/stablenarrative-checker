import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import styles from "./landing.module.css";

// The front door of the site. Ported from the standalone page that ran at
// stablenarrative-setup.netlify.app, copy unchanged. The checker lives at /app,
// behind the access-code screen; "Log in" takes testers there.

export const metadata: Metadata = {
  title: "StableNarrative | FCA compliance pre-check for crypto marketing",
  description:
    "Catch FCA breaches in your crypto marketing copy before your approver does. Free while we test with a small group of marketers.",
};

// One place to change the booking link. Both buttons use it.
const BOOKING_LINK = "https://calendly.com/sarah-shaefer-xexw/15-minute-setup-meeting";

function BookButton() {
  return (
    <a className={styles.cta} href={BOOKING_LINK} target="_blank" rel="noopener">
      Book a 15-minute setup call
    </a>
  );
}

export default function Landing() {
  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <Logo />
          <Link href="/app" className={styles.login}>
            Log in
          </Link>
        </header>

        <main>
          <div className={styles.hero}>
            <span className={styles.eyebrow}>
              In early access with a small group of marketers
            </span>
            <h1 className={styles.title}>
              Catch FCA breaches in your crypto marketing copy before your
              approver does.
            </h1>
            <p className={styles.lede}>
              StableNarrative checks your copy against the FCA&apos;s cryptoasset
              financial promotion rules in seconds. Every flag comes with the rule
              behind it, so what you send for sign-off needs fewer rounds of edits.
            </p>
            <p className={styles.signoff}>
              Your s21 approver still signs off, every time.
            </p>
            <BookButton />
            <span className={styles.ctaNote}>Free while we&apos;re testing.</span>
          </div>

          <section className={styles.section}>
            <h2 className={styles.h2}>We&apos;re calibrating it against real sign-offs</h2>
            <p className={styles.sectionIntro}>
              We&apos;re looking for marketers at UK crypto firms whose promotions go
              through compliance approval. You use the tool on real campaigns. We
              learn from what your approver decides.
            </p>
            <div className={styles.deal}>
              <div className={styles.dealBox}>
                <h3 className={styles.dealLabel}>You get</h3>
                <ul className={styles.dealList}>
                  <li>Free access for the whole testing phase</li>
                  <li>Every flag explained, with the rule it breaks</li>
                  <li>A 15-minute call where we run your first check together</li>
                </ul>
              </div>
              <div className={`${styles.dealBox} ${styles.dealAsk}`}>
                <h3 className={styles.dealLabel}>We ask</h3>
                <p className={styles.askLine}>
                  After sign-off, tell us whether your copy was approved.
                </p>
                <p className={styles.askSmall}>
                  That&apos;s it. Your copy is yours, and the approval decision stays
                  with your firm.
                </p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.h2}>How it works</h2>
            <ol className={styles.steps}>
              <li>
                <span>Book a 15-minute call.</span>
              </li>
              <li>
                <span>
                  We run your first check together, on screen, with your copy.
                </span>
              </li>
              <li>
                <span>
                  Use it on your next campaign, then tell us what your approver
                  said.
                </span>
              </li>
            </ol>
          </section>

          <section className={`${styles.section} ${styles.closing}`}>
            <h2 className={styles.h2}>
              Spend less time going back and forth with compliance
            </h2>
            <p className={styles.sectionIntro}>
              Places in the testing group are limited, so we can speak to every
              tester personally.
            </p>
            <BookButton />
          </section>
        </main>

        <footer className={styles.footer}>
          StableNarrative is a compliance pre-check that helps your approver. It
          isn&apos;t legal advice.
          <br />
          &copy; 2026 StableNarrative
        </footer>
      </div>
    </div>
  );
}
