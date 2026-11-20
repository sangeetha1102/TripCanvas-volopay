import React, { useEffect, useState } from 'react';
import { Copy, Check, Plus, Trash2, KeyRound } from 'lucide-react';
import type { McpTokenRecord } from '../types';
import { createMcpToken, fetchMcpTokens, revokeMcpToken } from '../lib/api';
import { formatDateShort } from '../lib/format';

interface McpAccessViewProps {
  userId: string;
}

export function McpAccessView({ userId }: McpAccessViewProps) {
  const [tokens, setTokens] = useState<McpTokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('Claude MCP Client');
  const [newRawToken, setNewRawToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mcpEndpoint =
    (import.meta.env.VITE_MCP_SERVER_URL as string | undefined) ||
    'http://localhost:3001/mcp';

  const loadTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMcpTokens();
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP tokens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTokens();
  }, [userId]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const { record, rawToken } = await createMcpToken(userId, label);
      setTokens((prev) => [record, ...prev]);
      setNewRawToken(rawToken);
      setLabel('Claude MCP Client');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token.');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setError(null);
    try {
      await revokeMcpToken(id);
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke token.');
    }
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const claudeConfigSnippet = JSON.stringify(
    {
      mcpServers: {
        tripcanvas: {
          command: 'npx',
          args: [
            '-y',
            'mcp-remote',
            mcpEndpoint,
            '--header',
            `Authorization: Bearer ${newRawToken ?? 'YOUR_TRIPCANVAS_MCP_TOKEN'}`,
          ],
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
          MCP Access
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Connect Claude to your TripCanvas Supabase workspace via the Streamable HTTP MCP server.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      {/* Endpoint & Available Tools */}
      <section className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-900">
            Streamable HTTP Endpoint
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Requires a personal Bearer token scoped to your account.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5">
          <code className="font-mono text-xs text-zinc-900 truncate">{mcpEndpoint}</code>
          <button
            type="button"
            onClick={() => handleCopy('endpoint', mcpEndpoint)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 shrink-0 cursor-pointer"
          >
            {copiedKey === 'endpoint' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div>
          <div className="text-xs font-medium text-zinc-700 mb-2">Registered MCP Tools</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {[
              ['create_trip', 'Create a new trip'],
              ['get_trip', 'Retrieve trip & activities'],
              ['add_itinerary_activity', 'Add a day-wise activity'],
              ['update_itinerary_activity', 'Update activity time/details'],
              ['delete_itinerary_activity', 'Remove an activity'],
            ].map(([name, desc]) => (
              <div
                key={name}
                className="px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-200"
              >
                <div className="font-mono font-medium text-zinc-900">{name}</div>
                <div className="text-zinc-500 mt-0.5">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Token Management */}
      <section className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="font-display text-base font-semibold text-zinc-900">
            Personal Access Tokens
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tokens are SHA-256 hashed in Supabase. Only your user trips and activities are accessible.
          </p>
        </div>

        <form onSubmit={handleCreateToken} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Token label (e.g. Claude Desktop)"
            required
            className="flex-1 px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{creating ? 'Generating...' : 'Generate Token'}</span>
          </button>
        </form>

        {newRawToken && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="text-xs font-medium text-emerald-900">
              Copy your new MCP token now — it will not be shown again.
            </div>
            <div className="flex items-center justify-between gap-3 bg-white border border-emerald-200 rounded-md px-3 py-2">
              <code className="font-mono text-xs text-zinc-900 break-all">{newRawToken}</code>
              <button
                type="button"
                onClick={() => handleCopy('rawToken', newRawToken)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 shrink-0 cursor-pointer"
              >
                {copiedKey === 'rawToken' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-16 rounded-lg bg-zinc-100 animate-pulse" />
        ) : tokens.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-lg">
            <KeyRound className="w-4 h-4 text-zinc-400 mx-auto mb-1.5" />
            No active MCP tokens yet. Generate one above to connect Claude.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg">
            {tokens.map((tok) => (
              <div
                key={tok.id}
                className="px-4 py-3 flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium text-zinc-900">{tok.label}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-zinc-500">
                    <span className="font-mono">{tok.token_prefix}</span>
                    <span aria-hidden="true">·</span>
                    <span>Created {formatDateShort(tok.created_at.slice(0, 10))}</span>
                    {tok.last_used_at && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Last used {formatDateShort(tok.last_used_at.slice(0, 10))}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(tok.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  aria-label={`Revoke ${tok.label}`}
                  title="Revoke token"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Claude Desktop Snippet */}
      <section className="bg-white border border-zinc-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-900">
              Claude Client Configuration
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              For Claude.ai Remote MCP use the URL + Bearer header directly, or use{' '}
              <code className="font-mono">mcp-remote</code> in{' '}
              <code className="font-mono">claude_desktop_config.json</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleCopy('snippet', claudeConfigSnippet)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 cursor-pointer shrink-0"
          >
            {copiedKey === 'snippet' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-lg bg-zinc-950 text-zinc-100 font-mono text-xs overflow-x-auto leading-relaxed">
          {claudeConfigSnippet}
        </pre>
      </section>
    </div>
  );
}
