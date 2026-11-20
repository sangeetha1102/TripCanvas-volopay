import React, { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  addActivity,
  createTrip,
  deleteActivity,
  deleteTrip,
  fetchTrips,
  fetchTripWithActivities,
  updateActivity,
  updateTrip,
} from './lib/api';
import type {
  Activity,
  ActivityFormValues,
  Trip,
  TripFormValues,
  TripWithActivities,
} from './types';
import { AuthScreen } from './components/AuthScreen';
import { Layout, type NavSection } from './components/Layout';
import { DashboardView } from './components/DashboardView';
import { TripsView } from './components/TripsView';
import { ItineraryView } from './components/ItineraryView';
import { McpAccessView } from './components/McpAccessView';
import { TripModal } from './components/TripModal';
import { ActivityModal } from './components/ActivityModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { getTripDurationDays } from './lib/format';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [section, setSection] = useState<NavSection>('dashboard');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  const [activeTrip, setActiveTrip] = useState<TripWithActivities | null>(null);
  const [tripDetailLoading, setTripDetailLoading] = useState(false);
  const [refreshingDetail, setRefreshingDetail] = useState(false);

  const [globalError, setGlobalError] = useState<string | null>(null);

  // Modals
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [defaultActivityDay, setDefaultActivityDay] = useState(1);
  const [savingActivity, setSavingActivity] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'trip'; trip: Trip }
    | { type: 'activity'; activity: Activity }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Initialize Supabase auth listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setAuthReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setTrips([]);
        setActiveTrip(null);
        setSelectedTripId(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadTrips = useCallback(async () => {
    if (!session?.user) return;
    setTripsLoading(true);
    setGlobalError(null);
    try {
      const data = await fetchTrips();
      setTrips(data);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Failed to load trips.');
    } finally {
      setTripsLoading(false);
    }
  }, [session?.user]);

  const loadActiveTrip = useCallback(
    async (tripId: string, silent = false) => {
      if (!session?.user) return;
      if (silent) {
        setRefreshingDetail(true);
      } else {
        setTripDetailLoading(true);
      }
      setGlobalError(null);
      try {
        const data = await fetchTripWithActivities(tripId);
        setActiveTrip(data);
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : 'Failed to load itinerary.');
        setActiveTrip(null);
      } finally {
        setTripDetailLoading(false);
        setRefreshingDetail(false);
      }
    },
    [session?.user]
  );

  useEffect(() => {
    if (session?.user) {
      void loadTrips();
    }
  }, [session?.user, loadTrips]);

  useEffect(() => {
    if (session?.user && selectedTripId) {
      void loadActiveTrip(selectedTripId);
    } else {
      setActiveTrip(null);
    }
  }, [session?.user, selectedTripId, loadActiveTrip]);

  // Live Supabase Realtime sync so MCP edits appear automatically in TripCanvas
  useEffect(() => {
    if (!supabase || !session?.user) return;
    const channel = supabase
      .channel(`tripcanvas-user-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          void loadTrips();
          if (selectedTripId) {
            void loadActiveTrip(selectedTripId, true);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'itinerary_activities',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          if (selectedTripId) {
            void loadActiveTrip(selectedTripId, true);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [session?.user, selectedTripId, loadTrips, loadActiveTrip]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F7F8F6] flex items-center justify-center text-sm text-zinc-500">
        Loading TripCanvas...
      </div>
    );
  }

  if (!isSupabaseConfigured || !session?.user) {
    return <AuthScreen />;
  }

  const user = session.user;

  const handleOpenCreateTrip = () => {
    setEditingTrip(null);
    setTripModalOpen(true);
  };

  const handleOpenEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setTripModalOpen(true);
  };

  const handleSaveTrip = async (values: TripFormValues) => {
    setSavingTrip(true);
    try {
      if (editingTrip) {
        const updated = await updateTrip(editingTrip.id, values);
        setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (activeTrip && activeTrip.id === updated.id) {
          setActiveTrip({ ...activeTrip, ...updated });
        }
      } else {
        const created = await createTrip(user.id, values);
        setTrips((prev) =>
          [...prev, created].sort((a, b) => a.start_date.localeCompare(b.start_date))
        );
        setSection('trips');
        setSelectedTripId(created.id);
      }
      setTripModalOpen(false);
    } finally {
      setSavingTrip(false);
    }
  };

  const handleOpenAddActivity = (day: number) => {
    setEditingActivity(null);
    setDefaultActivityDay(day);
    setActivityModalOpen(true);
  };

  const handleOpenEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setDefaultActivityDay(activity.day);
    setActivityModalOpen(true);
  };

  const handleSaveActivity = async (values: ActivityFormValues) => {
    if (!activeTrip) return;
    setSavingActivity(true);
    try {
      if (editingActivity) {
        const updated = await updateActivity(editingActivity.id, values);
        setActiveTrip((prev) =>
          prev
            ? {
                ...prev,
                activities: prev.activities.map((a) =>
                  a.id === updated.id ? updated : a
                ),
              }
            : null
        );
      } else {
        const created = await addActivity(user.id, activeTrip.id, values);
        setActiveTrip((prev) =>
          prev
            ? {
                ...prev,
                activities: [...prev.activities, created],
              }
            : null
        );
      }
      setActivityModalOpen(false);
    } finally {
      setSavingActivity(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'trip') {
        await deleteTrip(deleteTarget.trip.id);
        setTrips((prev) => prev.filter((t) => t.id !== deleteTarget.trip.id));
        if (selectedTripId === deleteTarget.trip.id) {
          setSelectedTripId(null);
          setActiveTrip(null);
        }
      } else {
        await deleteActivity(deleteTarget.activity.id);
        setActiveTrip((prev) =>
          prev
            ? {
                ...prev,
                activities: prev.activities.filter(
                  (a) => a.id !== deleteTarget.activity.id
                ),
              }
            : null
        );
      }
      setDeleteTarget(null);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleNavigate = (next: NavSection) => {
    setSection(next);
    if (next !== 'trips') {
      setSelectedTripId(null);
    }
  };

  const handleOpenTrip = (tripId: string) => {
    setSection('trips');
    setSelectedTripId(tripId);
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
  };

  const breadcrumb =
    section === 'dashboard'
      ? 'TripCanvas / Dashboard'
      : section === 'mcp'
      ? 'TripCanvas / MCP Access'
      : selectedTripId && activeTrip
      ? `TripCanvas / My Trips / ${activeTrip.name}`
      : 'TripCanvas / My Trips';

  return (
    <Layout
      activeSection={section}
      breadcrumb={breadcrumb}
      userEmail={user.email ?? 'Account'}
      onNavigate={handleNavigate}
      onNewTrip={handleOpenCreateTrip}
      onSignOut={handleSignOut}
    >
      {globalError && (
        <div
          role="alert"
          className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between"
        >
          <span>{globalError}</span>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-red-700 font-medium underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {section === 'dashboard' && (
        <DashboardView
          trips={trips}
          loading={tripsLoading}
          onOpenTrip={handleOpenTrip}
          onCreateTrip={handleOpenCreateTrip}
          onViewAllTrips={() => handleNavigate('trips')}
        />
      )}

      {section === 'trips' && !selectedTripId && (
        <TripsView
          trips={trips}
          loading={tripsLoading}
          onOpenTrip={handleOpenTrip}
          onCreateTrip={handleOpenCreateTrip}
          onEditTrip={handleOpenEditTrip}
          onDeleteTrip={(trip) => setDeleteTarget({ type: 'trip', trip })}
        />
      )}

      {section === 'trips' && selectedTripId && (
        <ItineraryView
          trip={activeTrip}
          loading={tripDetailLoading}
          refreshing={refreshingDetail}
          onBack={() => setSelectedTripId(null)}
          onRefresh={() => loadActiveTrip(selectedTripId, true)}
          onEditTrip={handleOpenEditTrip}
          onAddActivity={handleOpenAddActivity}
          onEditActivity={handleOpenEditActivity}
          onDeleteActivity={(activity) =>
            setDeleteTarget({ type: 'activity', activity })
          }
        />
      )}

      {section === 'mcp' && <McpAccessView userId={user.id} />}

      <TripModal
        open={tripModalOpen}
        initialTrip={editingTrip}
        saving={savingTrip}
        onClose={() => setTripModalOpen(false)}
        onSave={handleSaveTrip}
      />

      <ActivityModal
        open={activityModalOpen}
        initialActivity={editingActivity}
        defaultDay={defaultActivityDay}
        maxDay={
          activeTrip
            ? getTripDurationDays(activeTrip.start_date, activeTrip.end_date)
            : 30
        }
        saving={savingActivity}
        onClose={() => setActivityModalOpen(false)}
        onSave={handleSaveActivity}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.type === 'trip' ? 'Delete Trip' : 'Delete Activity'
        }
        description={
          deleteTarget?.type === 'trip'
            ? `Are you sure you want to delete "${deleteTarget.trip.name}" and all of its scheduled activities? This cannot be undone.`
            : deleteTarget?.type === 'activity'
            ? `Are you sure you want to remove "${deleteTarget.activity.title}" from Day ${deleteTarget.activity.day}?`
            : ''
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </Layout>
  );
}
