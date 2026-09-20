import { manualProvider } from "./manual";
import { ltiProvider } from "./lti";
import type { SubmissionProvider } from "./types";

const REGISTRY: Record<string, SubmissionProvider> = {
  [manualProvider.id]: manualProvider,
  [ltiProvider.id]: ltiProvider,
};

export function getProvider(id?: string | null): SubmissionProvider {
  const key = id || process.env.SUBMISSION_PROVIDER || manualProvider.id;
  const provider = REGISTRY[key];
  if (!provider) throw new Error(`Unknown submission provider: ${key}`);
  return provider;
}

export type { SubmissionProvider, SubmissionContext, ProviderReport } from "./types";
