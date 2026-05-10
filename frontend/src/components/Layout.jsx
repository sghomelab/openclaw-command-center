import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function Layout({ children, title }) {
  const [currentPage, setCurrentPage] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handler = () => {
      const hash = window.location.hash;
      const path = hash.replace('#/', '') || 'dashboard';
      setCurrentPage(path);
    };
    window.addEventListener('hashchange', handler);
    handler();
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      <Sidebar
        currentPage={currentPage}
        onNavigate={(path) => { window.location.hash = path.replace('#', ''); }}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <main className={`transition-all duration-300 ${collapsed ? 'ml-16' : 'ml-64'}`}>
        <header className="h-16 bg-bg-secondary/80 backdrop-blur border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-20">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{title || currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge badge-success">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 inline-block animate-pulse" />
              Online
            </span>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
