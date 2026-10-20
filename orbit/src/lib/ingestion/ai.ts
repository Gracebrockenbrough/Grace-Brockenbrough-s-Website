import type { AiExtractor } from "./types";

/**
 * AI extraction is a fallback only, used for fields the deterministic parser
 * couldn't read. It isn't configured in the prototype, so it never runs and
 * the customer is asked to fill gaps instead.
 *
 * A production implementation must: send only the message text (no account data),
 * instruct the model that the email is untrusted data, accept only schema-valid
 * JSON for the requested fields, and cap confidence at "medium".
 */
export const aiExtractor: AiExtractor = {
  available: false,
  async fill() {
    return {};
  },
};
