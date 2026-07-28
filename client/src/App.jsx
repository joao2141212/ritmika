import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppErrorBoundary from './components/AppErrorBoundary';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/DashboardRemote'));
const ChecklistWorkspace = lazy(() => import('./components/ChecklistWorkspace'));
const ChecklistBuilderWorkspace = lazy(() => import('./components/ChecklistBuilderWorkspace'));
const ChecklistExecutionWorkspace = lazy(() => import('./components/ChecklistExecutionWorkspace'));
const ChecklistDetails = lazy(() => import('./components/ChecklistDetailsRemote'));
const Settings = lazy(() => import('./pages/SettingsRemote'));
const Configurations = lazy(() => import('./pages/ConfigurationsRemote'));
const ChecklistContagem = lazy(() => import('./pages/ChecklistContagem'));
const ChecklistHistorico = lazy(() => import('./pages/ChecklistHistorico'));
const Team = lazy(() => import('./pages/TeamRemote'));
const WorkspaceSelection = lazy(() => import('./pages/WorkspaceSelection'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AIAnalyses = lazy(() => import('./pages/AIAnalysesRemote'));
const Courses = lazy(() => import('./pages/CoursesRemote'));
const CourseModules = lazy(() => import('./pages/CourseModulesRemote'));
const Help = lazy(() => import('./pages/HelpRemote'));
const Ideas = lazy(() => import('./pages/IdeasRemote'));
const PlatformIdeasAdmin = lazy(() => import('./pages/PlatformIdeasAdmin'));
const News = lazy(() => import('./pages/NewsRemote'));

const AppBoot = () => (
  <main className="app-boot" role="status" aria-live="polite">
    <div className="app-boot-mark" aria-hidden="true">R</div>
    <div className="app-boot-copy">
      <strong>Preparando seu espaço</strong>
      <span>Carregando dados e permissões do Ritmika</span>
    </div>
    <div className="app-boot-progress" aria-hidden="true"><span /></div>
  </main>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading, workspaceSelection } = useAuth();

  if (loading) {
    return <AppBoot />;
  }

  if (workspaceSelection) {
    return (
      <Suspense fallback={<AppBoot />}>
        <WorkspaceSelection />
      </Suspense>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

import { Toaster } from 'react-hot-toast';
import OfflineSync from './components/OfflineSync';

function App() {
  return (
    <AuthProvider>
      <AppErrorBoundary>
        <Router>
        <OfflineSync />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#ffffff',
            color: '#14212b',
            border: '1px solid #dbe4ea'
          }
        }} />
        <Suspense fallback={<AppBoot />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="checklists" element={<ChecklistWorkspace />} />
            <Route path="checklists/new" element={<ChecklistBuilderWorkspace />} />
            <Route path="checklist/add" element={<ChecklistBuilderWorkspace />} />
            <Route path="checklists/:id/edit" element={<ChecklistBuilderWorkspace />} />
            <Route path="checklists/:id/execute" element={<ChecklistExecutionWorkspace />} />
            <Route path="checklists/:id/contagem" element={<ChecklistContagem />} />
            <Route path="checklists/:id/historico" element={<ChecklistHistorico />} />
            <Route path="checklists/:id/details" element={<ChecklistDetails />} />
            <Route path="settings" element={<Settings />} />
            <Route path="configurations" element={<Configurations />} />
            <Route path="team" element={<Team />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="ai-evidence-analyses" element={<AIAnalyses />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:id/modules" element={<CourseModules />} />
            <Route path="help" element={<Help />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="platform/ideas" element={<PlatformIdeasAdmin />} />
            <Route path="news" element={<News />} />
          </Route>
        </Routes>
        </Suspense>
        </Router>
      </AppErrorBoundary>
    </AuthProvider>
  );
}

export default App;
