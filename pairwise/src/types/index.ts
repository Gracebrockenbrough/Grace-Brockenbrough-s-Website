// Pairwise domain model.
//
// Data is split into explicit namespaces so the UI can never combine them by accident:
//   shared_user_model          → SharedUserModel      (high-level human traits; cross-domain only if allowed)
//   personal_model             → PersonalModel        (dating model — never shown in Professional)
//   professional_model         → ProfessionalModel    (career model — never shown to dating matches)
//   private_ai_memory          → MemoryItem[]          (what Pairwise has learned; private by default)
//   visible_personal_profile   → VisiblePersonalProfile
//   visible_professional_profile → VisibleProfessionalProfile

export type Domain = 'shared' | 'personal' | 'professional';

/** Who may see a stored fact. Nothing is visible unless it says so. */
export type Visibility =
  | 'private_ai'
  | 'shared_internal'
  | 'personal_profile'
  | 'professional_profile'
  | 'mutual_match_only'
  | 'public';

export type MemorySource = 'user_stated' | 'ai_inferred' | 'user_confirmed' | 'user_rejected';

export type MemoryCategory =
  | 'about_me'
  | 'what_i_want'
  | 'preferences'
  | 'patterns'
  | 'career_goals'
  | 'relationship_goals'
  | 'past_feedback';

export interface MemoryItem {
  id: string;
  domain: Domain;
  category: MemoryCategory;
  key: string;
  /** Short human-readable summary shown to the user. */
  summary: string;
  value: unknown;
  source: MemorySource;
  /** Where it came from, e.g. "voice onboarding", "feedback after meeting Marco". */
  origin: string;
  confidence: number; // 0–1
  confirmed: boolean;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export type PreferenceStrength =
  | 'hard_requirement'
  | 'very_important'
  | 'preference'
  | 'nice_to_have'
  | 'exploratory'
  | 'unknown';

export interface Preference {
  id: string;
  domain: Domain;
  type: string;
  value: unknown;
  label: string;
  strength: PreferenceStrength;
  flexibility: 'none' | 'low' | 'medium' | 'high';
  source: MemorySource;
  confirmed: boolean;
  /** Appearance and similar preferences are never shown to anyone else. */
  private: boolean;
}

export type IntentState = 'active' | 'passive' | 'paused' | 'off';
export type IntentType = 'dating' | 'friendship' | 'roommate' | 'activity' | 'travel' | 'full_time' | 'internship' | 'contract' | 'temporary' | 'cofounder';

export interface Intent {
  id: string;
  domain: 'personal' | 'professional';
  type: IntentType;
  state: IntentState;
  startDate: string;
  endDate?: string;
  location: string;
  radiusMiles: number;
  urgency: 'low' | 'medium' | 'high';
  availability: string;
  notes: string;
  lastConfirmedAt: string;
  /** Reconfirmation prompts shown without a response. */
  missedReconfirmations: number;
}

export type Level = 1 | 2 | 3 | 4 | 5;

export interface SharedUserModel {
  // High-level human traits. Only used across domains when cross-domain learning is on.
  ambition: Level;
  workSchedule: 'regular' | 'long_hours' | 'flexible';
  socialEnergy: Level;
  locationFlexibility: Level;
  homeCity: string;
}

export interface PersonalModel {
  age: number;
  gender: string;
  seeking: string[];
  ageRange: [number, number];
  maxDistanceMiles: number;
  relationshipIntent: 'long_term' | 'open_to_long_term' | 'casual' | 'unsure';
  values: string[];
  interests: string[];
  weekdaySocial: Level;
  weekendSocial: Level;
  independence: Level;
  spontaneity: Level;
  conflictStyle: 'direct' | 'reflective' | 'avoidant';
  communication: 'texter' | 'caller' | 'in_person';
  smoker: boolean;
  wantsKids: 'yes' | 'no' | 'open' | 'unsure';
  /** Stated preference for partner's social energy (1–5). */
  preferredPartnerSocial: Level;
  networkPreference: 'shared_matters' | 'somewhat' | 'dont_care' | 'outside_network';
}

export interface ResumeBullet {
  id: string;
  text: string;
  tags: string[];
}

export interface ResumeRole {
  id: string;
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: ResumeBullet[];
}

export interface ResumeMaster {
  headline: string;
  roles: ResumeRole[];
  education: { school: string; degree: string; year: string }[];
  certifications: string[];
  skills: string[];
}

export interface ProfessionalModel {
  currentTitle: string;
  yearsExperience: number;
  level: 'entry' | 'mid' | 'senior' | 'lead';
  functions: string[];
  industries: string[];
  skills: string[];
  interests: string[];
  preferredLocations: string[];
  workModels: WorkModel[];
  minCompensation: number;
  teamStyle: 'collaborative' | 'independent' | 'mixed';
  managerStyle: 'coaching' | 'hands_off' | 'structured';
  companyStages: ('startup' | 'growth' | 'enterprise' | 'boutique')[];
  careerGoal: string;
  resume: ResumeMaster;
}

export interface VisiblePersonalProfile {
  firstName: string;
  age: number;
  area: string;
  bio: string;
  tags: string[];
  photoHue: number;
}

export interface VisibleProfessionalProfile {
  name: string;
  headline: string;
  area: string;
  summary: string;
  skills: string[];
}

export interface UserProfile {
  firstName: string;
  age: number;
  location: string;
  bio: string;
  tags: string[];
  photoHue: number;
}

// ---------- Personal candidates ----------

export interface CandidatePreferences {
  ageRange: [number, number];
  seeking: string[];
  wantsIntent: PersonalModel['relationshipIntent'][];
  valuedTraits: string[];
  preferredPartnerSocial: Level;
  smokerOk: boolean;
}

export interface PersonalCandidate {
  id: string;
  firstName: string;
  age: number;
  gender: string;
  area: string;
  distanceMiles: number;
  photoHue: number;
  photoScenes: string[];
  facts: string[];
  story: string;
  lifestyle: string;
  intentionText: string;
  model: Omit<PersonalModel, 'age' | 'gender' | 'seeking' | 'ageRange' | 'maxDistanceMiles' | 'preferredPartnerSocial' | 'networkPreference'> & {
    workSchedule: SharedUserModel['workSchedule'];
  };
  preferences: CandidatePreferences;
  intentState: IntentState;
  lastActiveDays: number;
  verified: { photo: boolean; identity: boolean };
  mutualConnections: number;
  conversationPrompts: string[];
  /** Demo only: whether this person would say yes if introduced (hidden from UI). */
  demoWouldBeInterested: boolean;
}

export type IntroductionStatus = 'new' | 'viewed' | 'interested' | 'passed' | 'mutual' | 'hidden' | 'blocked';

export interface Introduction {
  candidateId: string;
  status: IntroductionStatus;
  updatedAt: string;
}

// ---------- Professional ----------

export type WorkModel = 'remote' | 'hybrid' | 'onsite';

export interface Company {
  id: string;
  name: string;
  monogram: string;
  color: string;
  stage: 'startup' | 'growth' | 'enterprise' | 'boutique';
  mission: string;
  team: string;
}

export interface JobOpportunity {
  id: string;
  company: Company;
  title: string;
  location: string;
  workModel: WorkModel;
  industry: string;
  level: ProfessionalModel['level'];
  salaryRange?: [number, number];
  overview: string;
  requirements: string[];
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  tags: string[];
  functions: string[];
  teamStyle: ProfessionalModel['teamStyle'];
  managerStyle: ProfessionalModel['managerStyle'];
  careerPath: string;
  /** What the employer said matters (from the employer conversation). */
  employerPriorities: string[];
  active: boolean;
}

export type OpportunityStatus = 'new' | 'saved' | 'interested' | 'dismissed';

// ---------- Feedback & patterns ----------

export type FeedbackRating = 'see_again' | 'good_unsure' | 'not_really' | 'definitely_not';
export type FeedbackTag = 'chemistry' | 'conversation' | 'lifestyle' | 'values' | 'attraction' | 'timing' | 'personality' | 'other';

export interface MatchFeedback {
  id: string;
  personName: string;
  rating: FeedbackRating;
  tags: FeedbackTag[];
  note: string;
  /** Social energy of the person, used for pattern detection. */
  otherSocialEnergy: Level;
  createdAt: string;
}

export interface PendingFeedback {
  id: string;
  personName: string;
  context: string;
  otherSocialEnergy: Level;
}

export interface PatternSuggestion {
  id: string;
  domain: Domain;
  prompt: string;
  memoryKey: string;
  status: 'pending' | 'yes' | 'maybe' | 'no';
}

// ---------- App state ----------

export type Plan = 'free' | 'premium';

export interface Settings {
  crossDomainLearning: boolean;
  notifications: { introductions: boolean; opportunities: boolean; reminders: boolean };
  personalVisibility: 'visible' | 'hidden';
  professionalVisibility: 'visible_to_employers' | 'matched_only' | 'hidden';
  plan: Plan;
  email: string;
}

export interface AppState {
  onboarded: boolean;
  participation: { personal: boolean; professional: boolean };
  profile: UserProfile;
  shared: SharedUserModel;
  personal: PersonalModel;
  professional: ProfessionalModel;
  visiblePersonal: VisiblePersonalProfile;
  visibleProfessional: VisibleProfessionalProfile;
  memory: MemoryItem[];
  preferences: Preference[];
  intents: Intent[];
  introductions: Introduction[];
  opportunities: Record<string, OpportunityStatus>;
  feedback: MatchFeedback[];
  pendingFeedback: PendingFeedback[];
  patterns: PatternSuggestion[];
  /** Consecutive passes; used to ask what Pairwise is missing instead of showing more. */
  consecutivePasses: number;
  explorationRate: number;
  temporarilyBroadened: boolean;
  settings: Settings;
  blockedIds: string[];
}
