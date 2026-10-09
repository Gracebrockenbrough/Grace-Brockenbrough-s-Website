import type { NotificationSettings, Preferences, User } from "@/types";

export const mockUser: User = {
  id: "user-grace",
  name: "Grace",
  fullName: "Grace Brockenbrough",
  email: "grace@demo.orbit.app",
  timezone: "America/New_York",
  school: "Washington and Lee University",
  year: "Junior",
};

export const defaultPreferences: Preferences = {
  sourceAdjust: {},
  ignoredSources: [{ key: "sender:Campus Bookstore", label: "Campus Bookstore promotions" }],
  recommendationAdjust: {},
};

export const defaultNotificationSettings: NotificationSettings = {
  urgent: true,
  today: true,
  morningBrief: true,
  importantChanges: true,
};
