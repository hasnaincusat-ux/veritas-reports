import type { ProviderResult, SubmissionContext, SubmissionProvider } from "./types";
import { SUBMISSION_STATUS } from "../types";

/**
 * Ships today: the job lands in the admin queue, an operator runs it through
 * their own Turnitin account and uploads the two PDFs back. No external calls.
 */
export const manualProvider: SubmissionProvider = {
  id: "manual",
  label: "Manual fulfilment",
  isManual: true,

  async submit(_ctx: SubmissionContext): Promise<ProviderResult> {
    return {
      status: SUBMISSION_STATUS.QUEUED,
      message: "Document received and queued for processing.",
    };
  },
};
