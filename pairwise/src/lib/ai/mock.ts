// Deterministic mock AI used when no provider is configured. It reads the user's words with simple
// rules so the demo behaves sensibly; a real model replaces this behind the same interface.
import type { FeedbackTag } from '../../types';
import { tailorResume } from '../resume';
import type { AIProvider, ExtractedStatement, OnboardingMode, Turn } from './types';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const OPENING: Record<OnboardingMode, string> = {
  personal: 'What are you hoping to find right now?',
  professional: 'What kind of work are you hoping to do next?',
  both: 'Let’s start with the personal side. What are you hoping to find right now?',
};

const PLANNED: Record<OnboardingMode, string[]> = {
  personal: [
    'Tell me about people you’ve connected well with in the past.',
    'What tends to make you feel comfortable around someone?',
    'What does your ideal week look like?',
    'What would be a complete dealbreaker?',
    'Tell me anything you know about your type. If you don’t really have one, that’s fine too.',
  ],
  professional: [
    'Tell me about a team or manager where you did your best work.',
    'Where do you want to be based, and how do you like to work?',
    'What would make a new role clearly better than what you have now?',
  ],
  both: [
    'What tends to make you feel comfortable around someone?',
    'What does your ideal week look like?',
    'What would be a complete dealbreaker?',
    'Now the professional side. What kind of work are you hoping to do next?',
    'Tell me about a team or manager where you did your best work.',
  ],
};

const FOLLOW_UPS: { test: RegExp; question: string }[] = [
  { test: /downtime|recharge|alone time|introvert/i, question: 'When you need downtime during the week, what does that look like — and how would you want a partner to handle it?' },
  { test: /serious|long[- ]term|marriage|settle/i, question: 'What would a good first year of a serious relationship look like for you?' },
  { test: /flak|ghost|inconsistent|games/i, question: 'That sounds frustrating. What would consistency look like from someone early on?' },
  { test: /manager|boss|mentor/i, question: 'What did that manager do that brought out your best work?' },
  { test: /remote|hybrid|office/i, question: 'How many days in person would feel right to you?' },
];

export const SAMPLE_ANSWERS: Record<string, string> = {
  [OPENING.personal]: 'Something serious. I want a real partner, but someone who has their own life too.',
  [OPENING.both]: 'Something serious. I want a real partner, but someone who has their own life too.',
  [OPENING.professional]: 'I want to move into wealth management or strategic finance — more client-facing, still analytical.',
  'Tell me about people you’ve connected well with in the past.': 'The best ones were calm and curious. Good listeners who were kind to everyone, including waiters.',
  'What tends to make you feel comfortable around someone?': 'Honesty, kindness, and when they can talk things through directly instead of going quiet.',
  'What does your ideal week look like?':
    'I like going out on weekends but during the week I actually really need downtime. I want someone social but I don’t want to have to be doing things every second. Ideally a hike or travel on weekends.',
  'What would be a complete dealbreaker?': 'Smoking. And anyone who isn’t sure they want kids someday.',
  'Tell me anything you know about your type. If you don’t really have one, that’s fine too.': 'I usually end up with people taller than me, but it’s not a rule.',
  'Now the professional side. What kind of work are you hoping to do next?': 'Wealth management or strategic finance — client-facing, but still analytical.',
  'Tell me about a team or manager where you did your best work.': 'A small collaborative team where my manager coached me but gave me room to own things.',
  'Where do you want to be based, and how do you like to work?': 'New York, hybrid ideally. Remote could work for the right company.',
  'What would make a new role clearly better than what you have now?': 'More client contact and a clear path to growth, at a high-growth company or a strong boutique.',
};

const RULES: { test: RegExp; make: () => Omit<ExtractedStatement, 'id'>; attrs?: Record<string, unknown> }[] = [
  {
    test: /weekend/i,
    make: () => ({ text: 'You like being social on weekends but need downtime during the week.', domain: 'shared', category: 'about_me', key: 'social_rhythm', value: { weekday: 2, weekend: 4 }, confidence: 0.86 }),
    attrs: { weekdaySocial: 2, weekendSocial: 4 },
  },
  {
    test: /own life|every second|independen|own space|own thing|room to/i,
    make: () => ({ text: 'You want someone social but independent — not together every second.', domain: 'shared', category: 'about_me', key: 'independence', value: 'high', confidence: 0.82 }),
    attrs: { independence: 5 },
  },
  {
    test: /serious|long[- ]term|real partner|marriage/i,
    make: () => ({ text: 'You’re looking for a serious, long-term relationship.', domain: 'personal', category: 'relationship_goals', key: 'relationship_intent', value: 'long_term', confidence: 0.93 }),
    attrs: { relationshipIntent: 'long_term' },
  },
  {
    test: /kind|honest|listen/i,
    make: () => ({ text: 'Kindness and honesty matter a lot to you in a partner.', domain: 'personal', category: 'what_i_want', key: 'values', value: ['kindness', 'honesty'], confidence: 0.85 }),
  },
  {
    test: /directly|talk things through|going quiet/i,
    make: () => ({ text: 'You prefer to talk things through directly rather than go quiet.', domain: 'shared', category: 'about_me', key: 'conflict_style', value: 'direct', confidence: 0.78 }),
    attrs: { conflictStyle: 'direct' },
  },
  {
    test: /smok/i,
    make: () => ({ text: 'Smoking is a dealbreaker.', domain: 'personal', category: 'preferences', key: 'dealbreaker_smoking', value: true, confidence: 0.96 }),
  },
  {
    test: /kids|children/i,
    make: () => ({ text: 'You want children someday, and want a partner who does too.', domain: 'personal', category: 'relationship_goals', key: 'wants_kids', value: 'yes', confidence: 0.84 }),
  },
  {
    test: /hike|travel|outdoor|cook/i,
    make: () => ({ text: 'Weekends outdoors and travel are a big part of your life.', domain: 'shared', category: 'about_me', key: 'interests', value: ['hiking', 'travel'], confidence: 0.75 }),
  },
  {
    test: /taller|tall /i,
    make: () => ({ text: 'You tend to be drawn to people taller than you — a soft preference, kept private.', domain: 'personal', category: 'preferences', key: 'appearance_height', value: 'taller', confidence: 0.7, sensitive: true }),
  },
  {
    test: /wealth|strategic finance|client/i,
    make: () => ({ text: 'You want more client-facing finance work — wealth management or strategic finance.', domain: 'professional', category: 'career_goals', key: 'career_goal', value: 'wealth_or_strategic_finance', confidence: 0.88 }),
  },
  {
    test: /collaborat|coach/i,
    make: () => ({ text: 'You do your best work on collaborative teams with a coaching manager.', domain: 'professional', category: 'career_goals', key: 'work_environment', value: { team: 'collaborative', manager: 'coaching' }, confidence: 0.82 }),
  },
  {
    test: /hybrid|remote/i,
    make: () => ({ text: 'You prefer hybrid work in New York, and would consider remote.', domain: 'professional', category: 'what_i_want', key: 'work_model', value: ['hybrid', 'remote'], confidence: 0.8 }),
  },
  {
    test: /growth|boutique|startup/i,
    make: () => ({ text: 'High-growth companies and strong boutiques appeal to you.', domain: 'professional', category: 'what_i_want', key: 'company_stage', value: ['growth', 'boutique'], confidence: 0.72 }),
  },
];

const TAG_RULES: { test: RegExp; tag: FeedbackTag }[] = [
  { test: /chemistry|spark|click/i, tag: 'chemistry' },
  { test: /conversation|talk|serious|boring|awkward/i, tag: 'conversation' },
  { test: /lifestyle|schedule|busy|late/i, tag: 'lifestyle' },
  { test: /values|believe|kids|religio/i, tag: 'values' },
  { test: /attract|looks|type/i, tag: 'attraction' },
  { test: /timing|not ready|moving/i, tag: 'timing' },
  { test: /personality|energy|loud|quiet|intense/i, tag: 'personality' },
];

export const mockAI: AIProvider = {
  name: 'Demo mode (mock responses)',

  async generateFollowUpQuestion(history, mode) {
    await wait(450);
    const planned = PLANNED[mode];
    const asked = new Set(history.map((t) => t.question));
    const followUpsUsed = history.filter((t) => FOLLOW_UPS.some((f) => f.question === t.question)).length;
    const last = history[history.length - 1];
    if (history.length >= 7) return { question: '', done: true };
    if (last && followUpsUsed < 2) {
      const f = FOLLOW_UPS.find((x) => x.test.test(last.answer) && !asked.has(x.question));
      if (f) return { question: f.question, done: false };
      if (last.answer.trim().split(/\s+/).length < 6 && !asked.has('Could you say a little more about that?'))
        return { question: 'Could you say a little more about that?', done: false };
    }
    const next = planned.find((q) => !asked.has(q));
    return next ? { question: next, done: false } : { question: '', done: true };
  },

  async extractUserModel(history, mode) {
    await wait(900);
    const text = history.map((t) => t.answer).join(' \n ');
    const statements: ExtractedStatement[] = [];
    const attributes: Record<string, unknown> = {};
    for (const rule of RULES) {
      const s = rule.make();
      if (mode === 'personal' && s.domain === 'professional') continue;
      if (mode === 'professional' && s.domain === 'personal') continue;
      if (rule.test.test(text)) {
        statements.push({ id: `x-${s.key}`, ...s });
        Object.assign(attributes, rule.attrs ?? {});
      }
    }
    if (statements.length < 5 && history.length) {
      statements.push({
        id: 'x-open',
        text: 'You know what you want, and you’d rather meet fewer, better-suited people.',
        domain: 'shared',
        category: 'what_i_want',
        key: 'quality_over_quantity',
        value: true,
        confidence: 0.55,
      });
    }
    return { statements: statements.slice(0, 8), attributes };
  },

  async explainMatch(input) {
    await wait(300);
    return { why: input.reasons, lessSure: input.concerns, cannotKnow: input.unknowns };
  },

  async summarizeFeedback(text) {
    await wait(500);
    const tags = TAG_RULES.filter((r) => r.test.test(text)).map((r) => r.tag);
    let learned: string | null = null;
    if (/too serious/i.test(text)) learned = 'You may prefer more playful conversation early on.';
    else if (/too (loud|intense|much)/i.test(text)) learned = 'High-intensity energy may not suit you on a first meeting.';
    else if (/boring|flat/i.test(text)) learned = 'You may want a bit more spark or spontaneity.';
    return { tags: [...new Set(tags)], summary: text.trim() ? text.trim() : 'No notes.', learned };
  },

  async tailorResume(master, job) {
    await wait(400);
    return tailorResume(master, job);
  },

  async ask(question, ctx) {
    await wait(600);
    const q = question.toLowerCase();
    if (/worr|concern|risk|downside|red flag/.test(q))
      return ctx.concerns.length ? `The main thing I’d watch: ${ctx.concerns[0].charAt(0).toLowerCase()}${ctx.concerns[0].slice(1)}` : `I don’t see a specific concern with ${ctx.name} yet.`;
    if (/why|fit|good/.test(q)) return ctx.reasons.slice(0, 2).join(' ');
    if (ctx.kind === 'match' && /talk|ask|first date|message|say/.test(q))
      return `Start with something you share: ${ctx.facts[0]?.toLowerCase() ?? 'what they love doing on weekends'}. Open questions work better than quick yes/no ones.`;
    if (ctx.kind === 'role' && /salary|pay|comp/.test(q)) return ctx.facts.find((f) => /\$/.test(f)) ?? 'The company hasn’t shared a salary range yet.';
    if (ctx.kind === 'role' && /interview|prepare/.test(q)) return `Prepare two stories that show ${ctx.reasons[0]?.toLowerCase().replace(/\.$/, '') ?? 'your most relevant experience'}. Expect questions about why now.`;
    return `Based on what I know, ${ctx.reasons[0]?.charAt(0).toLowerCase()}${ctx.reasons[0]?.slice(1) ?? 'this looks worth exploring.'} What I can’t know yet is how it feels in person.`;
  },
};

export const sampleAnswerFor = (question: string) => SAMPLE_ANSWERS[question] ?? '';
export type { Turn };
