import { supabase } from './supabase';
import type {
  Activity,
  ActivityFormValues,
  McpTokenRecord,
  Trip,
  TripFormValues,
  TripWithActivities,
} from '../types';

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check your environment variables.');
  }
  return supabase;
}

export async function fetchTrips(): Promise<Trip[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('trips')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    budget: Number(row.budget ?? 0),
    travellers: Number(row.travellers ?? 1),
  }));
}

export async function fetchTripWithActivities(tripId: string): Promise<TripWithActivities> {
  const client = requireClient();
  const [{ data: trip, error: tripError }, { data: activities, error: actError }] =
    await Promise.all([
      client.from('trips').select('*').eq('id', tripId).single(),
      client
        .from('itinerary_activities')
        .select('*')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })
        .order('time', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);

  if (tripError) throw new Error(tripError.message);
  if (actError) throw new Error(actError.message);

  return {
    ...trip,
    budget: Number(trip.budget ?? 0),
    travellers: Number(trip.travellers ?? 1),
    activities: (activities ?? []) as Activity[],
  };
}

export async function createTrip(userId: string, values: TripFormValues): Promise<Trip> {
  const client = requireClient();
  const { data, error } = await client
    .from('trips')
    .insert({
      user_id: userId,
      name: values.name.trim(),
      destination: values.destination.trim(),
      start_date: values.start_date,
      end_date: values.end_date,
      travellers: Math.max(1, Math.round(values.travellers)),
      budget: Math.max(0, Number(values.budget) || 0),
      currency: values.currency.trim().toUpperCase() || 'USD',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    budget: Number(data.budget ?? 0),
    travellers: Number(data.travellers ?? 1),
  };
}

export async function updateTrip(tripId: string, values: TripFormValues): Promise<Trip> {
  const client = requireClient();
  const { data, error } = await client
    .from('trips')
    .update({
      name: values.name.trim(),
      destination: values.destination.trim(),
      start_date: values.start_date,
      end_date: values.end_date,
      travellers: Math.max(1, Math.round(values.travellers)),
      budget: Math.max(0, Number(values.budget) || 0),
      currency: values.currency.trim().toUpperCase() || 'USD',
    })
    .eq('id', tripId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return {
    ...data,
    budget: Number(data.budget ?? 0),
    travellers: Number(data.travellers ?? 1),
  };
}

export async function deleteTrip(tripId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('trips').delete().eq('id', tripId);
  if (error) throw new Error(error.message);
}

export async function addActivity(
  userId: string,
  tripId: string,
  values: ActivityFormValues
): Promise<Activity> {
  const client = requireClient();
  const { data, error } = await client
    .from('itinerary_activities')
    .insert({
      user_id: userId,
      trip_id: tripId,
      day: Math.max(1, Math.round(values.day)),
      title: values.title.trim(),
      location: values.location.trim(),
      time: values.time.trim(),
      notes: values.notes.trim(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Activity;
}

export async function updateActivity(
  activityId: string,
  values: Partial<ActivityFormValues>
): Promise<Activity> {
  const client = requireClient();
  const payload: Record<string, unknown> = {};
  if (values.day !== undefined) payload.day = Math.max(1, Math.round(values.day));
  if (values.title !== undefined) payload.title = values.title.trim();
  if (values.location !== undefined) payload.location = values.location.trim();
  if (values.time !== undefined) payload.time = values.time.trim();
  if (values.notes !== undefined) payload.notes = values.notes.trim();

  const { data, error } = await client
    .from('itinerary_activities')
    .update(payload)
    .eq('id', activityId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Activity;
}

export async function deleteActivity(activityId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('itinerary_activities').delete().eq('id', activityId);
  if (error) throw new Error(error.message);
}

export async function fetchMcpTokens(): Promise<McpTokenRecord[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('mcp_tokens')
    .select('id, user_id, label, token_prefix, last_used_at, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as McpTokenRecord[];
}

async function sha256HexBrowser(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createMcpToken(
  userId: string,
  label: string
): Promise<{ record: McpTokenRecord; rawToken: string }> {
  const client = requireClient();
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const randomHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const rawToken = `tc_${randomHex}`;
  const tokenHash = await sha256HexBrowser(rawToken);
  const tokenPrefix = `${rawToken.slice(0, 10)}...${rawToken.slice(-4)}`;

  const { data, error } = await client
    .from('mcp_tokens')
    .insert({
      user_id: userId,
      label: label.trim() || 'Claude MCP Client',
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
    })
    .select('id, user_id, label, token_prefix, last_used_at, created_at')
    .single();

  if (error) throw new Error(error.message);
  return {
    record: data as McpTokenRecord,
    rawToken,
  };
}

export async function revokeMcpToken(tokenId: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.from('mcp_tokens').delete().eq('id', tokenId);
  if (error) throw new Error(error.message);
}
