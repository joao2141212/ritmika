import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import Dashboard from './pages/DashboardRemote';
import ChecklistWorkspace from './components/ChecklistWorkspace';
import ChecklistBuilderWorkspace from './components/ChecklistBuilderWorkspace';
import ChecklistExecutionWorkspace from './components/ChecklistExecutionWorkspace';
import ChecklistDetails from './components/ChecklistDetailsRemote';
import Settings from './pages/SettingsRemote';
import Configurations from './pages/ConfigurationsRemote';

import ChecklistContagem from './pages/ChecklistContagem';
import ChecklistHistorico from './pages/ChecklistHistorico';
import Team from './pages/TeamRemote';
import Notifications from './pages/Notifications';
import AIAnalyses from './pages/AIAnalysesRemote';
import Courses from './pages/CoursesRemote';
import CourseModules from './pages/CourseModulesRemote';
import Help from './pages/HelpRemote';
import Ideas from './pages/IdeasRemote';
import News from './pages/NewsRemote';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Carregando Ritmika...</div>;
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
      <Router>
        <OfflineSync />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#ffffff',
            color: '#14212b',
            border: '1px solid #dbe4ea'
          }
        }} />
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
            <Route path="news" element={<News />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
