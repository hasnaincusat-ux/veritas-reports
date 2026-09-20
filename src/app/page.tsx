import {
  FileSearch,
  Gauge,
  LockKeyhole,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { ContactForm } from "@/components/site/ContactForm";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { HeroDemo } from "@/components/site/HeroDemo";
import { db } from "@/lib/db";

const SITE = process.env.NEXT_PUBLIC_SITE_NAME || "Veritas Reports";

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload your document",
    body: "PDF, Word, PowerPoint or plain text, up to 100 MB. One credit covers one check.",
  },
  {
    icon: Gauge,
    title: "We run the analysis",
    body: "Your file is checked for matched sources and for AI-generated writing. Watch progress live.",
  },
  {
    icon: FileSearch,
    title: "Download both reports",
    body: "A similarity report and an AI-writing report, as PDFs you can keep or share.",
  },
];

const REASONS = [
  {
    icon: LockKeyhole,
    title: "Nothing is indexed",
    body: "Your work is checked without being added to any repository, so submitting it later stays clean.",
  },
  {
    icon: Trash2,
    title: "Deleted after 7 days",
    body: "Uploads are purged automatically. Your reports stay in your dashboard; the source file does not.",
  },
  {
    icon: Sparkles,
    title: "Similarity and AI, together",
    body: "Every check returns both a matched-text percentage and an AI-writing estimate. No second purchase.",
  },
  {
    icon: ShieldCheck,
    title: "Private downloads",
    body: "Reports are served only to your signed-in account. No public links, no shared folders.",
  },
];

export default async function HomePage() {
  const reviews = await db.review.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, name: true, rating: true, body: true },
  });

  return (
    <>
      <Header />

      <main>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden">
          <div className="vignette pointer-events-none absolute inset-0" aria-hidden />
          <div className="shell relative grid gap-14 py-20 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-28">
            <div className="animate-fade-up space-y-7">
              <span className="inline-flex items-center gap-2 rounded-pill bg-surface px-3.5 py-1.5 text-xs font-semibold text-brand-600 shadow-soft ring-1 ring-ink/10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
                Most checks finish inside ten minutes
              </span>

              <h1 className="text-[2.6rem] font-bold leading-[1.06] tracking-tight sm:text-6xl">
                <span className="text-ink">Know your score</span>
                <br />
                <span className="gradient-text">before it counts.</span>
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-ink-soft">
                Run a draft through the same checks a marker would, read the result in
                plain language, and fix what matters before you hand it in.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href="/register" size="lg" variant="primary">
                  Start free
                </ButtonLink>
                <ButtonLink href="/#how" size="lg" variant="outline">
                  Watch the flow
                </ButtonLink>
              </div>

              <dl className="flex flex-wrap gap-x-10 gap-y-4 pt-4">
                {[
                  { k: "Turnaround", v: "Minutes" },
                  { k: "Max upload", v: "100 MB" },
                  { k: "Source files", v: "Deleted in 7 days" },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                      {s.k}
                    </dt>
                    <dd className="text-lg font-semibold">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="animate-fade-up [animation-delay:120ms]">
              <HeroDemo />

              <p className="mt-3 text-center text-xs text-ink-faint">
                An example report. Your own figures come from your document.
              </p>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ how it works */}
        <section id="how" className="scroll-mt-24 border-y border-ink/10 bg-surface">
          <div className="shell py-20">
            <p className="eyebrow">How it runs</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              From upload to report in three moves
            </h2>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="group relative rounded-xl2 border border-ink/10 bg-cream p-7 transition-shadow hover:shadow-lift"
                >
                  <span className="text-5xl font-bold text-ink/10">0{i + 1}</span>
                  <s.icon className="mt-4 h-7 w-7 text-brand-600" strokeWidth={1.6} />
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- why */}
        <section id="why" className="scroll-mt-24">
          <div className="shell py-20">
            <p className="eyebrow">Why {SITE}</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Your document stays <span className="marker">yours</span>.
            </h2>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {REASONS.map((r) => (
                <Card key={r.title} className="flex gap-5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl2 bg-brand-50 text-brand-600">
                    <r.icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {r.body}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- reviews */}
        <section id="reviews" className="scroll-mt-24 border-y border-ink/10 bg-surface">
          <div className="shell py-20">
            <p className="eyebrow">Reviews</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              What people say
            </h2>

            {reviews.length === 0 ? (
              <p className="mt-8 max-w-lg text-ink-soft">
                No reviews published yet. Once customers leave feedback and an admin
                approves it, it appears here.
              </p>
            ) : (
              <div className="mt-12 grid gap-5 md:grid-cols-3">
                {reviews.map((r) => (
                  <figure
                    key={r.id}
                    className="flex flex-col rounded-xl2 border border-ink/10 bg-cream p-7"
                  >
                    <Quote className="h-6 w-6 text-brand-300" strokeWidth={1.6} />
                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                      {r.body}
                    </blockquote>
                    <figcaption className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
                      <span className="text-sm font-semibold">{r.name}</span>
                      <span className="flex gap-0.5" aria-label={`${r.rating} out of 5`}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={
                              i < r.rating
                                ? "h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                : "h-3.5 w-3.5 text-ink/20"
                            }
                          />
                        ))}
                      </span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* --------------------------------------------------------- contact */}
        <section id="contact" className="scroll-mt-24">
          <div className="shell grid gap-12 py-20 lg:grid-cols-[.85fr_1.15fr]">
            <div>
              <p className="eyebrow">Contact</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Questions before you start?
              </h2>
              <p className="mt-4 max-w-sm leading-relaxed text-ink-soft">
                Ask about file types, turnaround, or anything about a report you have
                already received.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  { icon: Timer, text: "Replies usually within a few hours" },
                  { icon: ShieldCheck, text: "We never share your documents" },
                ].map((i) => (
                  <p
                    key={i.text}
                    className="flex items-center gap-3 text-sm text-ink-soft"
                  >
                    <i.icon className="h-4 w-4 text-brand-600" strokeWidth={1.8} />
                    {i.text}
                  </p>
                ))}
              </div>
            </div>

            <Card className="p-7">
              <ContactForm />
            </Card>
          </div>
        </section>

        {/* ------------------------------------------------------------- cta */}
        <section className="shell">
          <div className="relative overflow-hidden rounded-xl3 bg-gradient-to-br from-brand-500 to-brand-700 px-8 py-16 text-center sm:px-16">
            <div
              className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready to check your document?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-brand-200">
                Create an account free. Your first check is on us.
              </p>
              <ButtonLink href="/register" size="lg" variant="primary" className="mt-8">
                Get started
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
