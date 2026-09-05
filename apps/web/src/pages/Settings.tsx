import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';

const settingsSections = [
  { name: 'General', href: '/settings' },
  { name: 'Repositories', href: '/settings/repositories' },
  { name: 'AI Prompts', href: '/settings/prompts' },
  { name: 'Publishing', href: '/settings/publishing' },
  { name: 'Notifications', href: '/settings/notifications' },
  { name: 'Team', href: '/settings/team' },
];

export function Settings() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      <div className="flex gap-6">
        <nav className="w-64 flex-shrink-0">
          <div className="card p-4">
            <ul className="space-y-1">
              {settingsSections.map((section) => (
                <li key={section.name}>
                  <NavLink
                    to={section.href}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800'
                      }`
                    }
                  >
                    {section.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function SettingsGeneral() {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">General Settings</h2>
      <div className="space-y-6">
        <div>
          <label className="label">Organization Name</label>
          <input type="text" className="input" defaultValue="My Organization" />
        </div>
        <div>
          <label className="label">Default Timezone</label>
          <select className="input">
            <option>UTC</option>
            <option>America/New_York</option>
            <option>America/Los_Angeles</option>
            <option>Europe/London</option>
            <option>Europe/Paris</option>
            <option>Asia/Tokyo</option>
          </select>
        </div>
        <div>
          <label className="label">Default Content Types</label>
          <div className="space-y-2">
            {['release_notes', 'technical_article', 'product_announcement', 'tutorial'].map((type) => (
              <label key={type} className="flex items-center space-x-2">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="text-sm text-gray-700 dark:text-gray-300">{type.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
}

export function SettingsRepositories() {
  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Repositories</h2>
        <button className="btn-primary">Add Repository</button>
      </div>
      <div className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">
          No repositories connected yet. Click "Add Repository" to connect a GitHub or GitLab repository.
        </p>
      </div>
    </div>
  );
}

export function SettingsPrompts() {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">AI Prompts</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Configure prompts for AI content generation. System prompts are global; content-type prompts can be overridden per repository.
      </p>
      <div className="space-y-4">
        {['release_notes', 'technical_article', 'product_announcement', 'tutorial'].map((type) => (
          <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white capitalize mb-2">{type.replace('_', ' ')}</h3>
            <textarea className="input min-h-[100px] font-mono text-sm" placeholder="Enter prompt template..." />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPublishing() {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Publishing Channels</h2>
      <div className="space-y-4">
        {['blog', 'social', 'newsletter', 'webhook'].map((type) => (
          <div key={type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white capitalize">{type}</h3>
              <button className="btn-secondary text-sm">Configure</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsNotifications() {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Notifications</h2>
      <div className="space-y-4">
        {['draft_created', 'review_requested', 'publish_scheduled', 'publish_due', 'publish_failed'].map((event) => (
          <div key={event} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white capitalize mb-3">{event.replace('_', ' ')}</h3>
            <div className="flex flex-wrap gap-2">
              {['email', 'slack', 'in_app', 'webhook'].map((channel) => (
                <label key={channel} className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded border-gray-300" defaultChecked={channel === 'in_app'} />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsTeam() {
  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Team Members</h2>
        <button className="btn-primary">Invite Member</button>
      </div>
      <div className="space-y-4">
        <p className="text-gray-500 dark:text-gray-400 text-center py-12">
          No team members yet. Click "Invite Member" to add collaborators.
        </p>
      </div>
    </div>
  );
}