import type { SubmissionStatus } from "../types";

export interface SubmissionContext {
  submissionId: string;
  reference: string;
  title: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  user: { id: string; email: string; name: string };
}

export interface ProviderResult {
  /** Provider-side identifier, e.g. a Turnitin submission id. */
  providerRef?: string;
  status: SubmissionStatus;
  /** Shown to the user on the progress timeline. */
  message: string;
}

export interface ProviderReport {
  similarityScore?: number;
  aiScore?: number;
  wordCount?: number;
  pageCount?: number;
  similarityPdf?: Buffer;
  aiPdf?: Buffer;
}

/**
 * Everything the app needs from a fulfilment backend. The app never talks to
 * Turnitin directly — it talks to one of these — so swapping manual handling
 * for LTI automation is a config change, not a rewrite.
 */
export interface SubmissionProvider {
  readonly id: string;
  readonly label: string;
  /** True when a human moves the job along in the admin queue. */
  readonly isManual: boolean;

  submit(ctx: SubmissionContext): Promise<ProviderResult>;
  /** Automated providers poll; manual ones return null and wait for an admin. */
  poll?(ctx: SubmissionContext, providerRef: string): Promise<ProviderResult | null>;
  fetchReport?(
    ctx: SubmissionContext,
    providerRef: string,
  ): Promise<ProviderReport | null>;
  cancel?(ctx: SubmissionContext, providerRef: string): Promise<void>;
}
