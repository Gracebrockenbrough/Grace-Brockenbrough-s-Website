// Provider selection. With no endpoint configured, Pairwise runs on deterministic mock responses.
// To connect a real model, deploy a small server that implements these routes (keeping API keys
// server-side) and set VITE_AI_ENDPOINT. The UI calls `ai.*` and never talks to a vendor directly.
import { mockAI } from './mock';
import type { AIProvider } from './types';

class HttpAIProvider implements AIProvider {
  readonly name = 'Connected AI service';
  constructor(private endpoint: string) {}

  private async call<T>(route: string, body: unknown, fallback: () => Promise<T>): Promise<T> {
    try {
      const res = await fetch(`${this.endpoint}/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error(String(res.status));
      return (await res.json()) as T;
    } catch {
      return fallback(); // Never leave the user stuck if the service is down.
    }
  }

  generateFollowUpQuestion: AIProvider['generateFollowUpQuestion'] = (h, m) => this.call('follow-up', { history: h, mode: m }, () => mockAI.generateFollowUpQuestion(h, m));
  extractUserModel: AIProvider['extractUserModel'] = (h, m) => this.call('extract', { history: h, mode: m }, () => mockAI.extractUserModel(h, m));
  explainMatch: AIProvider['explainMatch'] = (i) => this.call('explain', i, () => mockAI.explainMatch(i));
  summarizeFeedback: AIProvider['summarizeFeedback'] = (t) => this.call('feedback', { text: t }, () => mockAI.summarizeFeedback(t));
  // Tailoring stays deterministic so facts can never be rewritten.
  tailorResume: AIProvider['tailorResume'] = (r, j) => mockAI.tailorResume(r, j);
  ask: AIProvider['ask'] = (q, c) => this.call('ask', { question: q, context: c }, () => mockAI.ask(q, c));
}

const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined;
export const ai: AIProvider = endpoint ? new HttpAIProvider(endpoint) : mockAI;
export type { AIProvider } from './types';
