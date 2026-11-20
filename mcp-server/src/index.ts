import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requireMcpAuth, type AuthenticatedRequest } from './auth.js';
import { createTripCanvasMcpServer } from './tools.js';

const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mcp-token', 'mcp-session-id'],
    exposedHeaders: ['mcp-session-id'],
  })
);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'tripcanvas-mcp-server',
    transport: 'streamable-http',
    tools: [
      'create_trip',
      'get_trip',
      'add_itinerary_activity',
      'update_itinerary_activity',
      'delete_itinerary_activity',
    ],
  });
});

app.post('/mcp', requireMcpAuth, async (req: AuthenticatedRequest, res: Response) => {
  const server = createTripCanvasMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP POST request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error handling MCP request.',
        },
        id: null,
      });
    }
  }
});

app.get('/mcp', requireMcpAuth, (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed on stateless Streamable HTTP endpoint. Use POST /mcp.',
    },
    id: null,
  });
});

app.delete('/mcp', requireMcpAuth, (_req: Request, res: Response) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Method not allowed on stateless Streamable HTTP endpoint.',
    },
    id: null,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TripCanvas MCP Server (Streamable HTTP) listening on http://0.0.0.0:${PORT}/mcp`);
});
