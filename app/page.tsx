import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/app/components/Logo";
import RevealOnScroll from "@/app/components/RevealOnScroll";
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
const BOOKING_LINK = "https://calendly.com/sarah-shaefer-xexw/20-minute-meeting";

function BookButton({ enter }: { enter?: string }) {
  return (
    <a
      className={styles.cta}
      href={BOOKING_LINK}
      target="_blank"
      rel="noopener"
      data-enter={enter}
    >
      Book a 20-minute call
    </a>
  );
}

export default function Landing() {
  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <Logo />
          <div className={styles.headerActions}>
            <a
              className={styles.headerBook}
              href={BOOKING_LINK}
              target="_blank"
              rel="noopener"
            >
              Book a 20-minute call
            </a>
            <Link href="/app" className={styles.login}>
              Log in
            </Link>
          </div>
        </header>

        <main>
          <div className={styles.hero}>
            <span className={styles.eyebrow} data-enter="0">
              In early access
            </span>
            <h1 className={styles.title}>
              <span className={styles.line} data-enter="1">
                Catch FCA breaches in
              </span>{" "}
              <span className={styles.line} data-enter="2">
                your crypto marketing copy
              </span>{" "}
              <span className={`${styles.line} ${styles.keep}`} data-enter="3">
                before your approver does.
              </span>
            </h1>
            <p className={styles.lede} data-enter="4">
              StableNarrative checks your copy against the FCA&apos;s cryptoasset
              financial promotion rules in seconds. Every flag comes with the rule
              behind it.
            </p>
            <p className={styles.signoff} data-enter="5">
              Compliance signs off in one round instead of five.
            </p>
            <BookButton enter="6" />
            <span className={styles.ctaNote} data-enter="6">
              Free while we&apos;re testing.
            </span>
          </div>

          <ProductDemo />

          <section className={styles.section} data-reveal>
            <h2 className={styles.h2}>We&apos;re calibrating it against real sign-offs</h2>
            <p className={styles.sectionIntro}>
              We&apos;re looking for marketers at UK crypto firms whose promotions go
              through compliance approval. You&apos;ll be able to use our proprietary
              tool for free on real campaigns.
            </p>
            <div className={styles.deal}>
              <div className={styles.dealBox}>
                <h3 className={styles.dealLabel}>You get</h3>
                <ul className={styles.dealList}>
                  <li>Free access for the whole testing phase</li>
                  <li>Every flag explained, with the rule it breaks</li>
                  <li>A 20-minute call where we run your first check together</li>
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

          <section className={styles.section} data-reveal>
            <h2 className={styles.h2}>How it works</h2>
            <ol className={styles.steps}>
              <li>
                <span>Book a 20-minute call.</span>
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

          <section className={`${styles.section} ${styles.closing}`} data-reveal>
            <h2 className={styles.h2}>
              Spend less time going back and forth with compliance
            </h2>
            <p className={styles.sectionIntro}>
              Limited spots, so we can speak to every tester personally.
            </p>
            <BookButton />
          </section>
        </main>

        <footer className={styles.footer}>
          <p className={styles.contact}>
            Questions? Email{" "}
            <a className={styles.contactLink} href="mailto:team@stablenarrative.com">
              team@stablenarrative.com
            </a>
          </p>
          StableNarrative is a compliance pre-check that helps your approver. It
          isn&apos;t legal advice.
          <br />
          &copy; 2026 StableNarrative
        </footer>
      </div>
      <RevealOnScroll />
    </div>
  );
}

/**
 * The product in motion (chosen 19 Sept 2026, option B): a white app window
 * floating on slowly drifting lavender and purple. The flagged words and flags
 * use the checker's own red and amber, and those colors stay inside the white
 * window so they never sit on purple. Pure CSS; still for reduce-motion users.
 */
function ProductDemo() {
  return (
    <div
      className={styles.demoStage}
      role="img"
      aria-label="Example check: StableNarrative flags “guaranteed” as a banned word, “Don't miss out” as urgency, and a missing risk warning."
    >
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={`${styles.blob} ${styles.blob3}`} />
      <div className={styles.win} aria-hidden="true">
        <div className={styles.winBar}>
          <i />
          <i />
          <i />
          <span>StableNarrative</span>
        </div>
        <div className={styles.winBody}>
          <div className={styles.demoCopy}>
            <span className={styles.demoLabel}>Your copy</span>
            Earn <span className={`${styles.mark} ${styles.mark1}`}>guaranteed</span> 12%
            returns on your crypto.{" "}
            <span className={`${styles.mark} ${styles.mark2}`}>Don&apos;t miss out</span>,
            join today.
          </div>
          <div className={styles.demoFlags}>
            <span className={styles.demoLabel}>What StableNarrative finds</span>
            <div className={`${styles.chip} ${styles.chip1}`}>
              <span className={styles.dot} />
              <b>&ldquo;guaranteed&rdquo;</b> · banned word, COBS 4.2.5G
            </div>
            <div className={`${styles.chip} ${styles.chip2}`}>
              <span className={`${styles.dot} ${styles.dotWarn}`} />
              <b>&ldquo;Don&apos;t miss out&rdquo;</b> · urgency, COBS 4.2.1R
            </div>
            <div className={`${styles.chip} ${styles.chip3}`}>
              <span className={styles.dot} />
              <b>Missing</b> · prescribed risk warning
            </div>
            <div className={styles.verdict}>Fix before sign-off: 3 issues</div>
          </div>
        </div>
      </div>
    </div>
  );
}
