'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface ProfileFormData {
  name: string;
  email: string;
  retellApiKey: string;
  retellWebhookKey: string;
  retellAgentId: string;
  webhookUrl: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface OAuthProvider {
  id: string;
  name: string;
  linked: boolean;
  icon: React.ReactNode;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    retellApiKey: '',
    retellWebhookKey: '',
    retellAgentId: '',
    webhookUrl: '',
  });
  const [hasRetellKey, setHasRetellKey] = useState(false);
  const [hasRetellWebhookKey, setHasRetellWebhookKey] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [retellKeyTouched, setRetellKeyTouched] = useState(false);
  const [retellWebhookKeyTouched, setRetellWebhookKeyTouched] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || profileLoaded) return;

    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setProfileForm((prev) => ({
            ...prev,
            name: data.data.name,
            email: data.data.email,
            retellAgentId: data.data.retellAgentId || '',
            webhookUrl: data.data.webhookUrl || '',
          }));
          setHasRetellKey(!!data.data.hasRetellKey);
          setHasRetellWebhookKey(!!data.data.hasRetellWebhookKey);
        }
        setProfileLoaded(true);
      })
      .catch(() => setProfileLoaded(true));
  }, [status, profileLoaded]);

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  if (status === 'loading') {
    return (
      <>
        <div className="aurora-bg">
          <div className="aurora-layer aurora-layer-1" />
          <div className="aurora-layer aurora-layer-2" />
          <div className="aurora-layer aurora-layer-3" />
          <div className="noise-overlay" />
        </div>
        <div className="min-h-screen flex items-center justify-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
        </div>
      </>
    );
  }

  const userImage = session?.user?.image;
  const hasGoogleAuth = userImage?.includes('google') || userImage?.includes('lh3.googleusercontent.com');

  const oauthProviders: OAuthProvider[] = [
    {
      id: 'google',
      name: 'Google',
      linked: hasGoogleAuth,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ),
    },
  ];

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      const body: {
        name: string;
        retell_agent_id: string | null;
        retell_api_key?: string | null;
        retell_webhook_key?: string | null;
      } = {
        name: profileForm.name,
        retell_agent_id: profileForm.retellAgentId.replace(/\r\n|\r|\n/g, '').trim() || null,
      };

      if (retellKeyTouched) {
        const key = profileForm.retellApiKey.replace(/\r\n|\r|\n/g, '').trim();
        body.retell_api_key = key || null;
      }

      if (retellWebhookKeyTouched) {
        const key = profileForm.retellWebhookKey.replace(/\r\n|\r|\n/g, '').trim();
        body.retell_webhook_key = key || null;
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const text = await response.text();
      let data: { success?: boolean; error?: string; data?: any } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setProfileMessage({
          type: 'error',
          text: response.ok ? 'An error occurred while updating profile' : 'Server error. Please try again.',
        });
        return;
      }

      if (response.ok) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
        if (retellKeyTouched) {
          setHasRetellKey(!!body.retell_api_key);
        }
        if (retellWebhookKeyTouched) {
          setHasRetellWebhookKey(!!body.retell_webhook_key);
        }
        setProfileForm((prev) => ({
          ...prev,
          retellApiKey: '',
          retellWebhookKey: '',
          retellAgentId: data.data?.retellAgentId ?? body.retell_agent_id ?? '',
          webhookUrl: data.data?.webhookUrl ?? prev.webhookUrl,
        }));
        setRetellKeyTouched(false);
        setRetellWebhookKeyTouched(false);
      } else {
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'An error occurred while updating profile' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setIsChangingPassword(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 8 characters long' });
      setIsChangingPassword(false);
      return;
    }

    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch {
      setPasswordMessage({ type: 'error', text: 'An error occurred while changing password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-layer aurora-layer-1" />
        <div className="aurora-layer aurora-layer-2" />
        <div className="aurora-layer aurora-layer-3" />
        <div className="noise-overlay" />
      </div>

      <div className="relative min-h-screen">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-50" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 border border-violet-200/50 dark:border-violet-700/50 mb-6">
                <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">Account Settings</span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-bold">
                <span className="gradient-text">Profile</span>
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                Manage your account settings and Retell workspace connection.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="glass-card rounded-2xl p-8 mb-6 animate-fade-in-up">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Information
            </h2>

            <div className="flex items-center gap-6 mb-8">
              <div className="flex-shrink-0">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <span className="text-3xl font-bold text-white">
                      {session?.user?.name?.charAt(0).toUpperCase() || session?.user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{session?.user?.name || 'User'}</h3>
                <p className="text-gray-600 dark:text-gray-400">{session?.user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate}>
              <div className="mb-5">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                  required
                />
              </div>

              <div className="mb-5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={profileForm.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  title="Email cannot be changed"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
              </div>

              <div className="mb-6 rounded-2xl border border-indigo-200/60 dark:border-indigo-700/60 bg-indigo-50/60 dark:bg-indigo-950/30 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Retell Workspace Connection</h3>
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <p>1. Save your workspace webhook key and optional agent ID here.</p>
                  <p>2. Copy the Post-call Webhook URL below into the matching Retell workspace.</p>
                  <p>3. Keep the API key only for call sync and detail fetches.</p>
                </div>
              </div>

              <div className="mb-5">
                <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Post-call Webhook URL
                </label>
                <input
                  type="text"
                  id="webhookUrl"
                  value={profileForm.webhookUrl}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Use this exact URL in Retell as-is. Do not replace it with the generic /api/retell/webhook route, because each customer has a unique token.
                </p>
              </div>

              <div className="mb-5">
                <label htmlFor="retellAgentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retell Agent ID
                </label>
                <input
                  type="text"
                  id="retellAgentId"
                  value={profileForm.retellAgentId}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, retellAgentId: e.target.value }))}
                  placeholder="Optional but recommended for fallback matching"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                  autoComplete="off"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  If a workspace has a single main agent, save it here so the legacy webhook route can still resolve calls.
                </p>
              </div>

              <div className="mb-5">
                <label htmlFor="retellWebhookKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retell Webhook Key
                </label>
                <input
                  type="password"
                  id="retellWebhookKey"
                  value={profileForm.retellWebhookKey}
                  onChange={(e) => {
                    setProfileForm((prev) => ({ ...prev, retellWebhookKey: e.target.value }));
                    setRetellWebhookKeyTouched(true);
                  }}
                  placeholder={hasRetellWebhookKey ? 'Saved. Enter a new key to replace it' : 'Paste the webhook signing key from this Retell workspace'}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                  autoComplete="off"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {hasRetellWebhookKey
                    ? 'Webhook key saved. Enter a new value only if you want to rotate it.'
                    : 'Required so the dashboard can verify Retell webhook signatures securely.'}
                </p>
              </div>

              <div className="mb-5">
                <label htmlFor="retellApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Retell API Key
                </label>
                <input
                  type="password"
                  id="retellApiKey"
                  value={profileForm.retellApiKey}
                  onChange={(e) => {
                    setProfileForm((prev) => ({ ...prev, retellApiKey: e.target.value }));
                    setRetellKeyTouched(true);
                  }}
                  placeholder={hasRetellKey ? 'Saved. Enter a new key to replace it' : 'Paste your Retell API key to sync calls'}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                  autoComplete="off"
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {hasRetellKey
                    ? 'API key saved. Enter a new value only if you want to replace it.'
                    : 'Used for manual sync and call detail fetches on the dashboard.'}
                </p>
              </div>

              {profileMessage && (
                <div
                  className={`mb-5 p-4 rounded-xl border ${
                    profileMessage.type === 'success'
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-400'
                      : 'bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-700/50 text-red-800 dark:text-red-400'
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          </div>

          <div className="glass-card rounded-2xl p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Linked Accounts
            </h2>

            <div className="space-y-4">
              {oauthProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">{provider.icon}</div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{provider.name}</p>
                      <p className={`text-sm ${provider.linked ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {provider.linked ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {provider.linked && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-700/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Linked
                    </span>
                  )}
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm text-gray-500 dark:text-gray-400 p-4 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
              OAuth providers are linked when you sign in with them. To link a new provider, sign out and sign in again using the provider.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Change Password
            </h2>

            <form onSubmit={handlePasswordChange}>
              <div className="mb-5">
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                  required
                />
              </div>

              <div className="mb-5">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                  required
                  minLength={8}
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Must be at least 8 characters long</p>
              </div>

              <div className="mb-5">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent backdrop-blur-sm transition-all"
                  required
                  minLength={8}
                />
              </div>

              {passwordMessage && (
                <div
                  className={`mb-5 p-4 rounded-xl border ${
                    passwordMessage.type === 'success'
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-400'
                      : 'bg-red-50/50 dark:bg-red-900/20 border-red-200/50 dark:border-red-700/50 text-red-800 dark:text-red-400'
                  }`}
                >
                  {passwordMessage.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
