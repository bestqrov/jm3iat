import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { MembersPage } from './pages/members/MembersPage';
import { AdministratifsPage } from './pages/members/AdministratifsPage';
import { MeetingsPage } from './pages/meetings/MeetingsPage';
import { MeetingDetailPage } from './pages/meetings/MeetingDetailPage';
import { FinancePage } from './pages/finance/FinancePage';
import { DocumentsPage } from './pages/documents/DocumentsPage';
import { ProjectsPage } from './pages/projects/ProjectsPage';
import { ProjectDetailPage } from './pages/projects/ProjectDetailPage';
import { WaterPage } from './pages/water/WaterPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { RequestsPage } from './pages/requests/RequestsPage';
import { RemindersPage } from './pages/reminders/RemindersPage';
import { SuperAdminPage } from './pages/superadmin/SuperAdminPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import AssocPage from './pages/assoc/AssocPage';
import { TransportPage } from './pages/transport/TransportPage';
import { SportsPage } from './pages/sports/SportsPage';
import { CoopPage } from './pages/coop/CoopPage';
import { CoopProductionPage } from './pages/coop/CoopProductionPage';
import { CoopVentesPage } from './pages/coop/CoopVentesPage';
import { CoopBoardPage } from './pages/coop/CoopBoardPage';
import { CoopProjectsPage } from './pages/coop/CoopProjectsPage';
import { CoopProjectDetailPage } from './pages/coop/CoopProjectDetailPage';
import { CoopControlPage } from './pages/coop/CoopControlPage';
import { CommercePage } from './pages/commerce/CommercePage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { ActivityPage } from './pages/activity/ActivityPage';
import { RecurringPage } from './pages/recurring/RecurringPage';
import { AssetsPage } from './pages/assets/AssetsPage';
import { PublicProfilePage } from './pages/public/PublicProfilePage';
import { StorePage } from './pages/store/StorePage';
import { StoreTrackPage } from './pages/store/StoreTrackPage';
import { LandingPage } from './pages/landing/LandingPage';
import { CoopLandingPage } from './pages/landing/CoopLandingPage';
import { PrivacyPage } from './pages/legal/PrivacyPage';
import { TermsPage } from './pages/legal/TermsPage';

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const WaterReaderRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isWaterReader } = useAuth();
  return isWaterReader ? <Navigate to="/water" replace /> : <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/p/:slug" element={<PublicProfilePage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/store/track" element={<StoreTrackPage />} />
              <Route path="/store/track/:orderNumber" element={<StoreTrackPage />} />
              <Route path="/cooperatives" element={<CoopLandingPage />} />

              {/* SuperAdmin — standalone layout (no global sidebar) */}
              <Route path="/superadmin" element={
                <SuperAdminRoute><SuperAdminPage /></SuperAdminRoute>
              } />

              {/* Protected routes — with global sidebar + header */}
              <Route element={<Layout />}>
                <Route path="/home" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<WaterReaderRoute><DashboardPage /></WaterReaderRoute>} />
                <Route path="/members" element={<WaterReaderRoute><MembersPage /></WaterReaderRoute>} />
                <Route path="/administratifs" element={<WaterReaderRoute><AdministratifsPage /></WaterReaderRoute>} />
                <Route path="/meetings" element={<WaterReaderRoute><MeetingsPage /></WaterReaderRoute>} />
                <Route path="/meetings/:id" element={<WaterReaderRoute><MeetingDetailPage /></WaterReaderRoute>} />
                <Route path="/finance" element={<WaterReaderRoute><FinancePage /></WaterReaderRoute>} />
                <Route path="/documents" element={<WaterReaderRoute><DocumentsPage /></WaterReaderRoute>} />
                <Route path="/projects" element={<WaterReaderRoute><ProjectsPage /></WaterReaderRoute>} />
                <Route path="/projects/:id" element={<WaterReaderRoute><ProjectDetailPage /></WaterReaderRoute>} />
                <Route path="/water" element={<WaterPage />} />
                <Route path="/assoc" element={<WaterReaderRoute><AssocPage /></WaterReaderRoute>} />
                <Route path="/transport" element={<WaterReaderRoute><TransportPage /></WaterReaderRoute>} />
                <Route path="/sports"    element={<WaterReaderRoute><SportsPage /></WaterReaderRoute>} />
                <Route path="/coop"            element={<WaterReaderRoute><CoopPage /></WaterReaderRoute>} />
                <Route path="/coop/production" element={<WaterReaderRoute><CoopProductionPage /></WaterReaderRoute>} />
                <Route path="/coop/ventes"     element={<WaterReaderRoute><CoopVentesPage /></WaterReaderRoute>} />
                <Route path="/coop/board"      element={<WaterReaderRoute><CoopBoardPage /></WaterReaderRoute>} />
                <Route path="/coop/projects"    element={<WaterReaderRoute><CoopProjectsPage /></WaterReaderRoute>} />
                <Route path="/coop/projects/:id" element={<WaterReaderRoute><CoopProjectDetailPage /></WaterReaderRoute>} />
                <Route path="/coop/control"    element={<WaterReaderRoute><CoopControlPage /></WaterReaderRoute>} />
                <Route path="/commerce" element={<WaterReaderRoute><CommercePage /></WaterReaderRoute>} />
                <Route path="/reports" element={<WaterReaderRoute><ReportsPage /></WaterReaderRoute>} />
                <Route path="/requests" element={<WaterReaderRoute><RequestsPage /></WaterReaderRoute>} />
                <Route path="/reminders" element={<WaterReaderRoute><RemindersPage /></WaterReaderRoute>} />
                <Route path="/calendar" element={<WaterReaderRoute><CalendarPage /></WaterReaderRoute>} />
                <Route path="/activity" element={<WaterReaderRoute><ActivityPage /></WaterReaderRoute>} />
                <Route path="/recurring" element={<WaterReaderRoute><RecurringPage /></WaterReaderRoute>} />
                <Route path="/assets"   element={<WaterReaderRoute><AssetsPage /></WaterReaderRoute>} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
