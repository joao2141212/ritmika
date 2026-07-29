import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { classifyAccess } from './lib/accessRouting';
import AppErrorBoundary from './components/AppErrorBoundary';
import RealtimeSync from './components/RealtimeSync';
import { serverState } from './lib/serverState';

const loadLayout = () => import('./components/Layout');
const loadDashboard = () => import('./pages/DashboardRemote');
const loadChecklistWorkspace = () => import('./components/ChecklistWorkspace');
const loadChecklistExecutionWorkspace = () => import('./components/ChecklistExecutionWorkspace');
const loadEmployeeLayout = () => import('./components/employee/EmployeeLayout');
const loadEmployeeHome = () => import('./pages/employee/EmployeeHome');
const loadEmployeeHistory = () => import('./pages/employee/EmployeeHistory');
const loadEmployeeNotifications = () => import('./pages/employee/EmployeeNotifications');
const loadEmployeeProfile = () => import('./pages/employee/EmployeeProfile');
const loadConfigurations = () => import('./pages/ConfigurationsRemote');
const loadTeam = () => import('./pages/TeamRemote');
const loadNotifications = () => import('./pages/Notifications');

const Layout = lazy(loadLayout);
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(loadDashboard);
const ChecklistWorkspace = lazy(loadChecklistWorkspace);
const ChecklistBuilderWorkspace = lazy(() => import('./components/ChecklistBuilderWorkspace'));
const ChecklistExecutionWorkspace = lazy(loadChecklistExecutionWorkspace);
const EmployeeLayout = lazy(loadEmployeeLayout);
const EmployeeHome = lazy(loadEmployeeHome);
const EmployeeHistory = lazy(loadEmployeeHistory);
const EmployeeNotifications = lazy(loadEmployeeNotifications);
const EmployeeProfile = lazy(loadEmployeeProfile);
const ChecklistDetails = lazy(() => import('./components/ChecklistDetailsRemote'));
const Settings = lazy(() => import('./pages/SettingsRemote'));
const Configurations = lazy(loadConfigurations);
const ChecklistContagem = lazy(() => import('./pages/ChecklistContagem'));
const ChecklistHistorico = lazy(() => import('./pages/ChecklistHistorico'));
const Team = lazy(loadTeam);
const WorkspaceSelection = lazy(() => import('./pages/WorkspaceSelection'));
const Notifications = lazy(loadNotifications);
const AIAnalyses = lazy(() => import('./pages/AIAnalysesRemote'));
const Courses = lazy(() => import('./pages/CoursesRemote'));
const CourseModules = lazy(() => import('./pages/CourseModulesRemote'));
const Help = lazy(() => import('./pages/HelpRemote'));
const Ideas = lazy(() => import('./pages/IdeasRemote'));
const PlatformIdeasAdmin = lazy(() => import('./pages/PlatformIdeasAdmin'));
const MasterAdmin = lazy(() => import('./pages/MasterAdmin'));
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

const MANAGER_ROUTE_LOADERS = [
  loadLayout,
  loadDashboard,
  loadChecklistWorkspace,
  loadConfigurations,
  loadTeam,
  loadNotifications,
];

const OPERATION_ROUTE_LOADERS = [
  loadEmployeeLayout,
  loadEmployeeHome,
  loadEmployeeHistory,
  loadEmployeeNotifications,
  loadEmployeeProfile,
  loadChecklistExecutionWorkspace,
];

const RouteWarmup = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return undefined;
    const { isManager, canAccessOperation } = classifyAccess(user);
    const loaders = [
      ...(isManager ? MANAGER_ROUTE_LOADERS : []),
      ...(canAccessOperation ? OPERATION_ROUTE_LOADERS : []),
    ];
    if (loaders.length === 0) return undefined;

    const warmRoutes = () => {
      void Promise.allSettled(loaders.map((loadRoute) => loadRoute()));
    };
    let idleId;
    let timeoutId;
    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(warmRoutes, { timeout: 1_500 });
    } else {
      timeoutId = window.setTimeout(warmRoutes, 250);
    }

    return () => {
      if (idleId) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [loading, user]);

  return null;
};

const ProtectedRoute = ({ children, audience = 'manager' }) => {
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

  const { isManager, isOperator, canAccessOperation } = classifyAccess(user);

  if (audience === 'manager' && !isManager) {
    return <Navigate to={isOperator ? '/app' : '/login'} replace />;
  }

  if (audience === 'employee' && !canAccessOperation) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

import { Toaster } from 'react-hot-toast';
import OfflineSync from './components/OfflineSync';

function App() {
  return (
    <QueryClientProvider client={serverState}>
      <AuthProvider>
        <RouteWarmup />
        <AppErrorBoundary>
        <Router>
        <OfflineSync />
        <RealtimeSync />
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

          <Route path="/app" element={
            <ProtectedRoute audience="employee">
              <EmployeeLayout />
            </ProtectedRoute>
          }>
            <Route index element={<EmployeeHome />} />
            <Route path="history" element={<EmployeeHistory />} />
            <Route path="notifications" element={<EmployeeNotifications />} />
            <Route path="profile" element={<EmployeeProfile />} />
            <Route
              path="checklists/:id/execute"
              element={<ChecklistExecutionWorkspace backPath="/app" />}
            />
          </Route>

          <Route path="/" element={
            <ProtectedRoute audience="manager">
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
            <Route path="master" element={<MasterAdmin />} />
            <Route path="news" element={<News />} />
          </Route>
        </Routes>
        </Suspense>
        </Router>
        </AppErrorBoundary>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
