import React, { useState } from 'react';
import { Compass, Lock, Mail, ArrowRight } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="min-h-screen bg-[#F7F8F6] flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-xl p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight text-zinc-900">
              TripCanvas
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-2">
            Connect Supabase to Get Started
          </h1>
          <p className="text-sm text-zinc-600 leading-relaxed mb-6">
            TripCanvas requires a Supabase PostgreSQL project for authentication and trip persistence.
            Add your public project credentials to your <code className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">.env</code> file and run the database schema.
          </p>

          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-6 font-mono text-xs text-zinc-800 space-y-1.5 overflow-x-auto">
            <div>VITE_SUPABASE_URL="https://your-project-ref.supabase.co"</div>
            <div>VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"</div>
            <div>VITE_MCP_SERVER_URL="http://localhost:3001/mcp"</div>
          </div>

          <ol className="text-sm text-zinc-600 space-y-2 list-decimal list-inside">
            <li>Create a project in Supabase and copy your Project URL and anon public key.</li>
            <li>Run <code className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">supabase/schema.sql</code> in the Supabase SQL Editor.</li>
            <li>Configure <code className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">.env</code> and restart the development server.</li>
          </ol>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice(
            'Account created. Check your email to confirm your address before signing in.'
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-8">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight text-zinc-900">
            TripCanvas
          </span>
        </div>

        <h1 className="font-display text-2xl font-semibold text-zinc-900 mb-1.5">
          {mode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}
        </h1>
        <p className="text-sm text-zinc-600 mb-6">
          {mode === 'signin'
            ? 'Plan trips, organize day-wise itineraries, and sync with Claude via MCP.'
            : 'Start planning trips with private user-scoped storage.'}
        </p>

        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
              setNotice(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'signin'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setNotice(null);
            }}
            className={`py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'signup'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-4 px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
          >
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>
              {loading
                ? 'Please wait...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
