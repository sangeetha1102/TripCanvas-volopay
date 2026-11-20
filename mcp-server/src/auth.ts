import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { getSupabaseAdmin } from './supabase.js';

export interface AuthenticatedRequest extends Request {
  auth?: AuthInfo;
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token.length > 0) return token;
  }
  const fallback = req.headers['x-mcp-token'];
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback.trim();
  }
  return null;
}

export async function verifyMcpToken(token: string): Promise<AuthInfo | null> {
  const supabase = getSupabaseAdmin();

  // 1. Personal Access Token issued inside TripCanvas (prefixed with "tc_")
  if (token.startsWith('tc_')) {
    const tokenHash = sha256Hex(token);
    const { data, error } = await supabase
      .from('mcp_tokens')
      .select('id, user_id')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Update last_used_at asynchronously without blocking the request
    void supabase
      .from('mcp_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error('Failed to update mcp_tokens.last_used_at:', updateError.message);
        }
      });

    return {
      token,
      clientId: data.user_id,
      scopes: ['trips:read', 'trips:write'],
      extra: {
        userId: data.user_id,
        tokenType: 'mcp_pat',
      },
    };
  }

  // 2. Standard Supabase Auth JWT access token
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return {
    token,
    clientId: data.user.id,
    scopes: ['trips:read', 'trips:write'],
    extra: {
      userId: data.user.id,
      email: data.user.email,
      tokenType: 'supabase_jwt',
    },
  };
}

export async function requireMcpAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res
      .status(401)
      .setHeader('WWW-Authenticate', 'Bearer realm="TripCanvas MCP"')
      .json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message:
            'Unauthorized: Provide a valid Bearer token (TripCanvas MCP token or Supabase JWT).',
        },
        id: null,
      });
    return;
  }

  try {
    const authInfo = await verifyMcpToken(token);
    if (!authInfo) {
      res
        .status(401)
        .setHeader('WWW-Authenticate', 'Bearer realm="TripCanvas MCP", error="invalid_token"')
        .json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Unauthorized: Invalid or revoked token.',
          },
          id: null,
        });
      return;
    }

    req.auth = authInfo;
    next();
  } catch (error) {
    console.error('MCP authentication error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal authentication verification error.',
      },
      id: null,
    });
  }
}
