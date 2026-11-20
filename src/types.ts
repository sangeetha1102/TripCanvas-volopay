export interface Trip {
  id: string;
  user_id: string;
  name: string;
  destination: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  travellers: number;
  budget: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  trip_id: string;
  user_id: string;
  day: number;
  title: string;
  location: string;
  time: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface TripWithActivities extends Trip {
  activities: Activity[];
}

export interface TripFormValues {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  travellers: number;
  budget: number;
  currency: string;
}

export interface ActivityFormValues {
  day: number;
  title: string;
  location: string;
  time: string;
  notes: string;
}

export interface McpTokenRecord {
  id: string;
  user_id: string;
  label: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
}
