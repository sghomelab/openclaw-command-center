import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import AlertsPage from './pages/AlertsPage';
import Tasks from './pages/Tasks';
import Projects from './pages/Projects';
import Workflows from './pages/Workflows';
import Integrations from './pages/Integrations';
import Audit from './pages/Audit';
import Settings from './pages/Settings';
import Knowledge from './pages/Knowledge';
import Calendar from './pages/Calendar';
import Agents from './pages/Agents';
import GatewayHealth from './pages/GatewayHealth';
import Crons from './pages/Crons';
import CronEditor from './pages/CronEditor';
import Events from './pages/Events';
import CostAnalytics from './pages/CostAnalytics';
import Sessions from './pages/Sessions';
import Skills from './pages/Skills';
import ConfigEditor from './pages/ConfigEditor';
import DiskUsage from './pages/DiskUsage';
import MemoryExplorer from './pages/MemoryExplorer';
import ConversationViewer from './pages/ConversationViewer';
import LLMWiki from './pages/LLMWiki';
import Backups from './pages/Backups';
import Monitoring from './pages/Monitoring';

const pages = {
  '': { component: Dashboard, title: 'Dashboard' },
  dashboard: { component: Dashboard, title: 'Dashboard' },
  alerts: { component: AlertsPage, title: 'Alert Rules' },
  tasks: { component: Tasks, title: 'Task Management' },
  projects: { component: Projects, title: 'Projects' },
  workflows: { component: Workflows, title: 'Workflow Engine' },
  integrations: { component: Integrations, title: 'Integrations' },
  audit: { component: Audit, title: 'Audit Logs' },
  settings: { component: Settings, title: 'Settings' },
  knowledge: { component: Knowledge, title: 'Knowledge Graph' },
  calendar: { component: Calendar, title: 'Calendar & Scheduling' },
  agents: { component: Agents, title: 'Agents' },
  gateway: { component: GatewayHealth, title: 'Gateway Health' },
  crons: { component: Crons, title: 'Cron Jobs' },
  croneditor: { component: CronEditor, title: 'Cron Editor' },
  sessions: { component: Sessions, title: 'Sessions' },
  skills: { component: Skills, title: 'Skills' },
  config: { component: ConfigEditor, title: 'Config Editor' },
  disk: { component: DiskUsage, title: 'Disk Usage' },
  memory: { component: MemoryExplorer, title: 'Memory Explorer' },
  conversations: { component: ConversationViewer, title: 'Conversations' },
  events: { component: Events, title: 'Event Feed' },
  costs: { component: CostAnalytics, title: 'Cost Analytics' },
  wiki: { component: LLMWiki, title: 'LLM Wiki' },
  backups: { component: Backups, title: 'Backup Status' },
  monitoring: { component: Monitoring, title: 'Monitoring Dashboard' },
};

function PrivateRoute() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState('');

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash;
      const path = hash.replace('#/', '') || '';
      setRoute(path);
    };
    window.addEventListener('hashchange', handler);
    handler();
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (route === 'login') return <LoginPage />;
    window.location.hash = '#/login';
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (route === 'login') {
    window.location.hash = '#/';
    return null;
  }

  const page = pages[route] || pages[''];
  const PageComponent = page.component;

  return (
    <Layout title={page.title}>
      <PageComponent />
    </Layout>
  );
}

export default function App() {
  return <PrivateRoute />;
}
