export const ROLE = { USER: "USER", ADMIN: "ADMIN" } as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const SUBMISSION_STATUS = {
  QUEUED: "QUEUED",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

export const STATUS_META: Record<
  SubmissionStatus,
  { label: string; blurb: string; tone: string; step: number }
> = {
  QUEUED: {
    label: "In queue",
    blurb: "Your document is in line and will start processing shortly.",
    tone: "bg-brand-50 text-brand-600 ring-brand-200",
    step: 1,
  },
  PROCESSING: {
    label: "Processing",
    blurb: "Running similarity and AI-writing analysis.",
    tone: "bg-amber-400/15 text-ink ring-amber-400/40",
    step: 2,
  },
  COMPLETED: {
    label: "Report ready",
    blurb: "Both reports are ready to download.",
    tone: "bg-mint-faint text-brand-700 ring-mint-deep/40",
    step: 3,
  },
  FAILED: {
    label: "Failed",
    blurb: "Something went wrong. Your credit has been refunded.",
    tone: "bg-oxblood/10 text-oxblood ring-oxblood/30",
    step: 3,
  },
  CANCELLED: {
    label: "Cancelled",
    blurb: "This submission was cancelled and the credit refunded.",
    tone: "bg-ink/5 text-ink-soft ring-ink/15",
    step: 3,
  },
};

export const CREDIT_REASON = {
  SIGNUP_BONUS: "SIGNUP_BONUS",
  ADMIN_GRANT: "ADMIN_GRANT",
  ADMIN_REVOKE: "ADMIN_REVOKE",
  SUBMISSION_CHARGE: "SUBMISSION_CHARGE",
  REFUND: "REFUND",
  LINK_RESERVE: "LINK_RESERVE",
  LINK_REFUND: "LINK_REFUND",
} as const;
export type CreditReason = (typeof CREDIT_REASON)[keyof typeof CREDIT_REASON];

export const CREDIT_REASON_LABEL: Record<CreditReason, string> = {
  SIGNUP_BONUS: "Welcome credit",
  ADMIN_GRANT: "Credits added",
  ADMIN_REVOKE: "Credits removed",
  SUBMISSION_CHARGE: "Report check",
  REFUND: "Refund",
  LINK_RESERVE: "Reserved for share link",
  LINK_REFUND: "Returned from share link",
};

export const ORIGIN = {
  DASHBOARD: "DASHBOARD",
  SHARE_LINK: "SHARE_LINK",
  API: "API",
} as const;
export type Origin = (typeof ORIGIN)[keyof typeof ORIGIN];

export const FEATURES = {
  shareLinks: {
    key: "featureShareLinks",
    label: "Share links",
    blurb: "Let this customer create prepaid check links to hand to other people.",
  },
  api: {
    key: "featureApi",
    label: "API access",
    blurb: "Let this customer submit checks from their own software with an API key.",
  },
} as const;
export type FeatureId = keyof typeof FEATURES;

export const ACCEPTED_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
};

export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
export const FILE_RETENTION_DAYS = 7;

/* ---------------------------------------------------------------- metrics */

/**
 * Each score gets its own accent so the two readings are never confused at a
 * glance. Severity (scoreBand) colours the figure itself; this colours the
 * ring and label, so identity and seriousness stay separate signals.
 */
export const METRICS = {
  similarity: {
    label: "Similarity",
    micro: "Similarity",
    ring: "stroke-sky",
    text: "text-sky",
    chip: "bg-sky",
  },
  ai: {
    label: "AI writing",
    micro: "AI detection",
    ring: "stroke-plum",
    text: "text-plum",
    chip: "bg-plum",
  },
} as const;
export type MetricId = keyof typeof METRICS;

/* ------------------------------------------------------------- exclusions */

export const SMALL_MATCH = {
  OFF: "OFF",
  WORDS: "WORDS",
  PERCENT: "PERCENT",
} as const;
export type SmallMatchMode = (typeof SMALL_MATCH)[keyof typeof SMALL_MATCH];

export type Exclusions = {
  excludeBibliography: boolean;
  excludeQuotes: boolean;
  smallMatchMode: SmallMatchMode;
  smallMatchValue: number | null;
};

/** What a university normally asks for, so the default is the common case. */
export const DEFAULT_EXCLUSIONS: Exclusions = {
  excludeBibliography: true,
  excludeQuotes: true,
  smallMatchMode: SMALL_MATCH.OFF,
  smallMatchValue: null,
};

/** Reads exclusion choices off a form, clamping the threshold to sane bounds. */
export function parseExclusions(
  get: (k: string) => FormDataEntryValue | null,
): Exclusions {
  const mode = String(get("smallMatchMode") ?? SMALL_MATCH.OFF).toUpperCase();
  const valid = (Object.values(SMALL_MATCH) as string[]).includes(mode)
    ? (mode as SmallMatchMode)
    : SMALL_MATCH.OFF;

  let value: number | null = null;
  if (valid !== SMALL_MATCH.OFF) {
    const raw = Math.round(Number(get("smallMatchValue")));
    const max = valid === SMALL_MATCH.PERCENT ? 100 : 1000;
    value = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), max) : null;
    // A threshold mode with no usable number is the same as no exclusion.
    if (value === null)
      return {
        ...DEFAULT_EXCLUSIONS,
        excludeBibliography: get("excludeBibliography") === "on",
        excludeQuotes: get("excludeQuotes") === "on",
      };
  }

  return {
    excludeBibliography: get("excludeBibliography") === "on",
    excludeQuotes: get("excludeQuotes") === "on",
    smallMatchMode: valid,
    smallMatchValue: value,
  };
}

/**
 * The shape as it comes back from the database. The schema stores the mode as
 * a portable String column, so readers take the wide type and narrow here.
 */
export type StoredExclusions = {
  excludeBibliography: boolean;
  excludeQuotes: boolean;
  smallMatchMode: string;
  smallMatchValue: number | null;
};

/** One-line summary used on report pages and in the admin queue. */
export function describeExclusions(e: StoredExclusions): string[] {
  const out: string[] = [];
  if (e.excludeBibliography) out.push("Bibliography excluded");
  if (e.excludeQuotes) out.push("Quotes excluded");
  if (e.smallMatchMode === SMALL_MATCH.WORDS && e.smallMatchValue)
    out.push(`Matches under ${e.smallMatchValue} words excluded`);
  if (e.smallMatchMode === SMALL_MATCH.PERCENT && e.smallMatchValue)
    out.push(`Matches under ${e.smallMatchValue}% excluded`);
  if (out.length === 0) out.push("No exclusions — everything counted");
  return out;
}
