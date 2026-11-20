import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getSupabaseAdmin } from './supabase.js';

type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

function getAuthenticatedUserId(extra: ToolExtra): string {
  const userId = extra.authInfo?.extra?.userId;
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('Unauthorized: Authenticated user context is missing.');
  }
  return userId;
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = Number(match24[1]);
    const m = Number(match24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = Number(match12[1]);
    const m = Number(match12[2]);
    const meridiem = match12[3].toUpperCase();
    if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
      if (meridiem === 'PM' && h !== 12) h += 12;
      if (meridiem === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return trimmed;
}

function jsonResult(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
  };
}

export function createTripCanvasMcpServer(): McpServer {
  const server = new McpServer({
    name: 'tripcanvas-mcp',
    version: '1.0.0',
  });

  // 1. create_trip
  server.registerTool(
    'create_trip',
    {
      title: 'Create Trip',
      description:
        'Create a new travel trip in TripCanvas for the authenticated user.',
      inputSchema: {
        name: z.string().min(1).describe('Trip title, e.g. "Goa Coastal Escape"'),
        destination: z.string().min(1).describe('Destination city or region, e.g. "Goa, India"'),
        start_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
          .describe('Trip start date in YYYY-MM-DD format'),
        end_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format')
          .describe('Trip end date in YYYY-MM-DD format'),
        travellers: z
          .number()
          .int()
          .min(1)
          .default(1)
          .describe('Number of travellers (integer >= 1)'),
        budget: z
          .number()
          .min(0)
          .default(0)
          .describe('Planned trip budget amount'),
        currency: z
          .string()
          .min(3)
          .max(10)
          .default('USD')
          .describe('ISO currency code, e.g. USD, INR, EUR'),
      },
    },
    async (args, extra) => {
      try {
        const userId = getAuthenticatedUserId(extra);
        if (args.end_date < args.start_date) {
          return errorResult('end_date must be on or after start_date.');
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
          .from('trips')
          .insert({
            user_id: userId,
            name: args.name.trim(),
            destination: args.destination.trim(),
            start_date: args.start_date,
            end_date: args.end_date,
            travellers: args.travellers,
            budget: args.budget,
            currency: args.currency.trim().toUpperCase(),
          })
          .select('*')
          .single();

        if (error || !data) {
          return errorResult(`Failed to create trip: ${error?.message ?? 'Unknown error'}`);
        }

        return jsonResult({ trip: data });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to create trip.');
      }
    }
  );

  // 2. get_trip
  server.registerTool(
    'get_trip',
    {
      title: 'Get Trip',
      description:
        'Retrieve a trip and its day-wise itinerary activities by trip_id or search query (name/destination).',
      inputSchema: {
        trip_id: z
          .string()
          .uuid()
          .optional()
          .describe('UUID of the trip to retrieve'),
        query: z
          .string()
          .optional()
          .describe('Optional name or destination filter if trip_id is not provided'),
      },
    },
    async (args, extra) => {
      try {
        const userId = getAuthenticatedUserId(extra);
        const supabase = getSupabaseAdmin();

        let tripQuery = supabase
          .from('trips')
          .select('*')
          .eq('user_id', userId);

        if (args.trip_id) {
          tripQuery = tripQuery.eq('id', args.trip_id);
        } else if (args.query && args.query.trim().length > 0) {
          const term = `%${args.query.trim()}%`;
          tripQuery = tripQuery.or(`name.ilike.${term},destination.ilike.${term}`);
        }

        const { data: trips, error: tripError } = await tripQuery
          .order('start_date', { ascending: true })
          .limit(args.trip_id ? 1 : 10);

        if (tripError) {
          return errorResult(`Failed to retrieve trip: ${tripError.message}`);
        }

        if (!trips || trips.length === 0) {
          return errorResult('No matching trip found for this user.');
        }

        const trip = trips[0];
        const { data: activities, error: actError } = await supabase
          .from('itinerary_activities')
          .select('*')
          .eq('trip_id', trip.id)
          .eq('user_id', userId)
          .order('day', { ascending: true })
          .order('time', { ascending: true })
          .order('created_at', { ascending: true });

        if (actError) {
          return errorResult(`Failed to retrieve activities: ${actError.message}`);
        }

        return jsonResult({
          trip,
          activities: activities ?? [],
          matched_trips_count: trips.length,
        });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : 'Failed to retrieve trip.');
      }
    }
  );

  // 3. add_itinerary_activity
  server.registerTool(
    'add_itinerary_activity',
    {
      title: 'Add Itinerary Activity',
      description: 'Add a day-wise activity to an existing trip owned by the user.',
      inputSchema: {
        trip_id: z.string().uuid().describe('UUID of the trip'),
        day: z.number().int().min(1).describe('Day number of the trip (e.g. 1, 2, 3)'),
        title: z.string().min(1).describe('Activity title'),
        location: z.string().default('').describe('Activity location or venue'),
        time: z
          .string()
          .default('')
          .describe('Activity time, e.g. "09:00" or "09:00 AM"'),
        notes: z.string().default('').describe('Additional notes for the activity'),
      },
    },
    async (args, extra) => {
      try {
        const userId = getAuthenticatedUserId(extra);
        const supabase = getSupabaseAdmin();

        const { data: trip, error: tripError } = await supabase
          .from('trips')
          .select('id')
          .eq('id', args.trip_id)
          .eq('user_id', userId)
          .maybeSingle();

        if (tripError) {
          return errorResult(`Failed to verify trip ownership: ${tripError.message}`);
        }
        if (!trip) {
          return errorResult('Trip not found or access denied.');
        }

        const { data: activity, error: insertError } = await supabase
          .from('itinerary_activities')
          .insert({
            trip_id: args.trip_id,
            user_id: userId,
            day: args.day,
            title: args.title.trim(),
            location: args.location.trim(),
            time: normalizeTime(args.time),
            notes: args.notes.trim(),
          })
          .select('*')
          .single();

        if (insertError || !activity) {
          return errorResult(
            `Failed to add itinerary activity: ${insertError?.message ?? 'Unknown error'}`
          );
        }

        return jsonResult({ activity });
      } catch (err) {
        return errorResult(
          err instanceof Error ? err.message : 'Failed to add itinerary activity.'
        );
      }
    }
  );

  // 4. update_itinerary_activity
  server.registerTool(
    'update_itinerary_activity',
    {
      title: 'Update Itinerary Activity',
      description:
        'Update an existing itinerary activity (day, title, location, time, or notes) owned by the user.',
      inputSchema: {
        activity_id: z.string().uuid().describe('UUID of the activity to update'),
        day: z.number().int().min(1).optional().describe('Updated day number'),
        title: z.string().min(1).optional().describe('Updated activity title'),
        location: z.string().optional().describe('Updated location'),
        time: z.string().optional().describe('Updated activity time, e.g. "11:00"'),
        notes: z.string().optional().describe('Updated notes'),
      },
    },
    async (args, extra) => {
      try {
        const userId = getAuthenticatedUserId(extra);
        const supabase = getSupabaseAdmin();

        const updates: Record<string, unknown> = {};
        if (args.day !== undefined) updates.day = args.day;
        if (args.title !== undefined) updates.title = args.title.trim();
        if (args.location !== undefined) updates.location = args.location.trim();
        if (args.time !== undefined) updates.time = normalizeTime(args.time);
        if (args.notes !== undefined) updates.notes = args.notes.trim();

        if (Object.keys(updates).length === 0) {
          return errorResult('Provide at least one field to update.');
        }

        const { data: activity, error } = await supabase
          .from('itinerary_activities')
          .update(updates)
          .eq('id', args.activity_id)
          .eq('user_id', userId)
          .select('*')
          .maybeSingle();

        if (error) {
          return errorResult(`Failed to update activity: ${error.message}`);
        }
        if (!activity) {
          return errorResult('Activity not found or access denied.');
        }

        return jsonResult({ activity });
      } catch (err) {
        return errorResult(
          err instanceof Error ? err.message : 'Failed to update itinerary activity.'
        );
      }
    }
  );

  // 5. delete_itinerary_activity
  server.registerTool(
    'delete_itinerary_activity',
    {
      title: 'Delete Itinerary Activity',
      description: 'Delete an itinerary activity by activity_id for the authenticated user.',
      inputSchema: {
        activity_id: z.string().uuid().describe('UUID of the activity to delete'),
      },
    },
    async (args, extra) => {
      try {
        const userId = getAuthenticatedUserId(extra);
        const supabase = getSupabaseAdmin();

        const { data: deleted, error } = await supabase
          .from('itinerary_activities')
          .delete()
          .eq('id', args.activity_id)
          .eq('user_id', userId)
          .select('id, trip_id, title')
          .maybeSingle();

        if (error) {
          return errorResult(`Failed to delete activity: ${error.message}`);
        }
        if (!deleted) {
          return errorResult('Activity not found or access denied.');
        }

        return jsonResult({ deleted: true, activity: deleted });
      } catch (err) {
        return errorResult(
          err instanceof Error ? err.message : 'Failed to delete itinerary activity.'
        );
      }
    }
  );

  return server;
}
