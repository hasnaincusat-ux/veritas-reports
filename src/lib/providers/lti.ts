import type { ProviderResult, SubmissionContext, SubmissionProvider } from "./types";

/**
 * Placeholder for Turnitin LTI tool-launch fulfilment. Implement submit() to
 * build the deep link from TURNITIN_ASSIGNMENT_TRN + TURNITIN_TEMPLATE_ID,
 * post the document, and store the returned submission id as providerRef;
 * poll()/fetchReport() then drive the job to COMPLETED with no admin involved.
 *
 * Deliberately throws rather than silently degrading, so selecting this
 * provider before it is finished fails loudly instead of losing submissions.
 */
export const ltiProvider: SubmissionProvider = {
  id: "lti",
  label: "Turnitin LTI (automated)",
  isManual: false,

  async submit(_ctx: SubmissionContext): Promise<ProviderResult> {
    throw new Error(
      "The LTI provider is not implemented yet. Set SUBMISSION_PROVIDER=manual.",
    );
  },
};
