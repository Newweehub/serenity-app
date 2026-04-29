import { useState } from 'react';
import { useUser } from '../hooks/useUser.js';
import { api } from '../lib/api.js';
import './Settings.css';

export default function Settings() {
  const { user, loading } = useUser();
  const [displayName,    setDisplayName]    = useState('');
  const [reminderTime,   setReminderTime]   = useState('');
  const [notifications,  setNotifications]  = useState(true);
  const [duration,       setDuration]       = useState(5);
  const [saved,          setSaved]          = useState(false);
  const [saving,         setSaving]         = useState(false);

  // Pre-fill from user profile once loaded
  useState(() => {
    if (user) {
      setDisplayName(user.profile?.displayName ?? '');
      setReminderTime(user.preferences?.reminderTime ?? '08:00');
      setNotifications(user.preferences?.notificationsEnabled ?? true);
      setDuration(user.memoryContext?.preferredMindfulnessDuration ?? 5);
    }
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.user.updatePreferences({
        displayName,
        reminderTime,
        notificationsEnabled: notifications,
        preferredMindfulnessDuration: duration,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    // Azure Static Web Apps built-in logout endpoint
    // Falls back to clearing localStorage for local dev
    if (window.location.hostname !== 'localhost') {
      window.location.href = '/.auth/logout';
    } else {
      localStorage.removeItem('serenity_user_id');
      window.location.reload();
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-skeletons stagger">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">

      {/* Profile */}
      <section className="settings-section fade-up">
        <h2 className="settings-section-title">Profile</h2>
        <form className="settings-form" onSubmit={handleSave}>

          <div className="settings-field">
            <label className="settings-label">Display name</label>
            <input
              className="settings-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Daily check-in reminder</label>
            <p className="settings-hint">When should Serenity remind you to check in each day?</p>
            <input
              type="time"
              className="settings-input settings-input-time"
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Preferred mindfulness duration</label>
            <div className="settings-duration-row">
              {[1, 3, 5, 10, 15].map(m => (
                <button
                  key={m}
                  type="button"
                  className={`duration-chip ${duration === m ? 'active' : ''}`}
                  onClick={() => setDuration(m)}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          <div className="settings-field settings-field-row">
            <div>
              <label className="settings-label">In-app notifications</label>
              <p className="settings-hint">Show reminder toasts when it's time for a habit</p>
            </div>
            <button
              type="button"
              className={`settings-toggle ${notifications ? 'on' : ''}`}
              onClick={() => setNotifications(v => !v)}
              aria-label="Toggle notifications"
            >
              <span className="toggle-thumb" />
            </button>
          </div>

          <div className="settings-actions">
            <button type="submit" className="btn-save-settings" disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
            </button>
          </div>

        </form>
      </section>

      {/* Account */}
      <section className="settings-section fade-up">
        <h2 className="settings-section-title">Account</h2>

        <div className="settings-account-row">
          <div>
            <p className="settings-label">Signed in as</p>
            <p className="settings-account-name">
              {user?.profile?.displayName || 'Guest'} &nbsp;
              <span className="settings-account-id">({localStorage.getItem('serenity_user_id') || 'dev-user-001'})</span>
            </p>
          </div>
        </div>

        <div className="settings-account-row">
          <div>
            <p className="settings-label">Microsoft login</p>
            <p className="settings-hint">
              {window.location.hostname !== 'localhost'
                ? 'Connected via Azure Static Web Apps authentication.'
                : 'Running in local dev mode — auth is simulated via localStorage.'}
            </p>
          </div>
        </div>

        <button className="btn-logout" onClick={handleLogout}>
          Sign out
        </button>
      </section>

      {/* About */}
      <section className="settings-section fade-up">
        <h2 className="settings-section-title">About Serenity</h2>
        <p className="settings-about">
          🌿 Serenity is an AI-powered mindfulness, journaling, and habit-tracking assistant.
          Built with Azure AI Foundry, Cosmos DB, and GPT-4.1-mini.
        </p>
        <p className="settings-version">v1.0 · Code Without Barriers Hackathon 2026</p>
      </section>

    </div>
  );
}
