import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Key, Shield, Bell, Database } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'api', label: 'API Keys', icon: Key },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'system', label: 'System', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Settings</h3>
        <p className="text-text-muted text-sm">Manage your account and system preferences</p>
      </div>

      <div className="flex gap-1 bg-bg-secondary p-1 rounded-lg w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === key ? 'bg-accent-primary text-white shadow-lg shadow-blue-500/20' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-lg">
            <h4 className="font-semibold">Profile Information</h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xl font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-lg">{user?.username}</p>
                <p className="text-text-muted">{user?.email}</p>
                <span className="badge badge-info mt-1">{user?.role}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Email</label>
              <input className="input" defaultValue={user?.email || ''} />
            </div>
            <button className="btn-primary">Save Changes</button>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6 max-w-lg">
            <h4 className="font-semibold">Security Settings</h4>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Current Password</label>
              <input type="password" className="input" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">New Password</label>
              <input type="password" className="input" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Confirm Password</label>
              <input type="password" className="input" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
              <Shield className="w-5 h-5 text-text-muted" />
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-text-muted">Add an extra layer of security</p>
              </div>
              <button className="btn-secondary ml-auto">Enable</button>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6 max-w-lg">
            <h4 className="font-semibold">API Keys</h4>
            <p className="text-text-muted text-sm">Create and manage API keys for programmatic access</p>
            <div className="p-4 bg-bg-secondary rounded-lg border border-gray-700">
              <p className="text-sm font-medium mb-2">Create New Key</p>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Key name..." />
                <button className="btn-primary">Generate</button>
              </div>
            </div>
            <div className="text-center py-8 text-text-muted">
              <Key className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No API keys created yet</p>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4 max-w-lg">
            <h4 className="font-semibold">Notification Preferences</h4>
            {[
              { label: 'Alert Notifications', desc: 'Get notified when alerts are triggered', checked: true },
              { label: 'Workflow Completion', desc: 'Notify when workflows finish running', checked: true },
              { label: 'System Updates', desc: 'Updates about system status and maintenance', checked: false },
              { label: 'Incident Reports', desc: 'Receive incident summaries', checked: true },
            ].map(({ label, desc, checked }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={checked} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary" />
                </label>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6 max-w-lg">
            <h4 className="font-semibold">System Information</h4>
            <div className="space-y-3">
              {[
                { label: 'Application', value: 'Claw Mission Control' },
                { label: 'Version', value: '3.0.0' },
                { label: 'API Base', value: '/v3' },
                { label: 'Database', value: 'SQLite (aiosqlite)' },
                { label: 'Auth', value: 'JWT (HS256)' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-bg-secondary rounded-lg">
                  <span className="text-sm text-text-secondary">{label}</span>
                  <span className="text-sm font-mono text-text-primary">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
