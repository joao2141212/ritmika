import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import ChecklistBuilder from './components/ChecklistBuilder';
import ChecklistExecution from './components/ChecklistExecution';
import ChecklistWorkspace from './components/ChecklistWorkspace';
import ChecklistBuilderWorkspace from './components/ChecklistBuilderWorkspace';
import ChecklistExecutionWorkspace from './components/ChecklistExecutionWorkspace';
import ChecklistDetails from './components/ChecklistDetails';
import Settings from './pages/Settings';

import Checklists from './pages/Checklists';
import ChecklistContagem from './pages/ChecklistContagem';
import ChecklistHistorico from './pages/ChecklistHistorico';
import Team from './pages/Team';

// Placeholder pages

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
            background: '#1c2128',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
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
            <Route path="checklists/:id/edit" element={<ChecklistBuilderWorkspace />} />
            <Route path="checklists/:id/execute" element={<ChecklistExecutionWorkspace />} />
            <Route path="checklists/:id/contagem" element={<ChecklistContagem />} />
            <Route path="checklists/:id/historico" element={<ChecklistHistorico />} />
            <Route path="checklists/:id/details" element={<ChecklistDetails />} />
            <Route path="settings" element={<Settings />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
