/**
 * Suggested replies ORBIT drafts. ORBIT never sends anything on its own —
 * the user copies or edits the draft and marks the message as replied.
 */
export const mockReplyDrafts: Record<string, { draft: string; followUp?: { title: string; date: string; startTime: string; endTime: string; location?: string; note: string } }> = {
  "m-martin": {
    draft: "Hi Professor Martin,\n\nMonday at 2:00 works for me. I'll stop by your office then.\n\nThank you,\nGrace",
    followUp: {
      title: "Meeting with Professor Martin",
      date: "2026-10-12",
      startTime: "14:00",
      endTime: "14:30",
      location: "Huntley 108",
      note: "You're free Monday at 2:00 PM.",
    },
  },
  "m-recruiter": {
    draft: "Hi Jordan,\n\nThank you for reaching out. Wednesday, Oct 14 at 11:00 AM works well for me.\n\nBest,\nGrace Brockenbrough",
    followUp: {
      title: "Harbor Point Capital interview",
      date: "2026-10-14",
      startTime: "11:00",
      endTime: "11:45",
      note: "Wednesday at 11:00 AM is open. Thursday at 3:00 PM is also free.",
    },
  },
  "m-mom": {
    draft: "Hi Mom! I fly ROA → BOS on Tuesday, Nov 24. Lands at 5:45 PM. Love you!",
  },
};
