import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AppShell } from './components/AppShell';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OpportunityPage } from './pages/OpportunityPage';
import { PersonalPage } from './pages/PersonalPage';
import { ProfessionalPage } from './pages/ProfessionalPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { useStore } from './state/store';
import { useEffect } from 'react';

// Future routes (not in the MVP navigation): /personal/friends, /personal/roommates,
// /personal/activities and /employer. The intent and data model already support them.

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
};

export default function App() {
  const { state } = useStore();
  if (!state.onboarded) {
    return (
      <div data-area="onboarding" className="min-h-screen bg-bg px-4 py-8 sm:px-6 sm:py-12">
        <OnboardingPage />
      </div>
    );
  }
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/welcome"
          element={
            <div data-area="onboarding" className="min-h-screen bg-bg px-4 py-8 sm:px-6 sm:py-12">
              <OnboardingPage />
            </div>
          }
        />
        <Route
          path="*"
          element={
            <AppShell>
              <Routes>
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/personal" element={<PersonalPage />} />
                <Route path="/personal/match/:id" element={<MatchDetailPage />} />
                <Route path="/professional" element={<ProfessionalPage />} />
                <Route path="/professional/opportunity/:id" element={<OpportunityPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/profile" replace />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
    </>
  );
}
