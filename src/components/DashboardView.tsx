import React from 'react';
import { ArrowRight, Plus, Calendar } from 'lucide-react';
import type { Trip } from '../types';
import {
  formatCurrency,
  formatDateRange,
  getTripDurationDays,
  isUpcomingTrip,
} from '../lib/format';

interface DashboardViewProps {
  trips: Trip[];
  loading: boolean;
  onOpenTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onViewAllTrips: () => void;
}

export function DashboardView({
  trips,
  loading,
  onOpenTrip,
  onCreateTrip,
  onViewAllTrips,
}: DashboardViewProps) {
  const upcomingTrips = trips.filter((t) => isUpcomingTrip(t.end_date));
  const totalDays = upcomingTrips.reduce(
    (sum, t) => sum + getTripDurationDays(t.start_date, t.end_date),
    0
  );
  const totalTravellers = upcomingTrips.reduce((sum, t) => sum + t.travellers, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Overview of your planned journeys and upcoming departures.
        </p>
      </div>

      {/* 4-Column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500">Total Trips</div>
          <div className="mt-2 font-display text-3xl font-semibold text-zinc-900 tabular-nums">
            {loading ? '—' : trips.length}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500">Upcoming Trips</div>
          <div className="mt-2 font-display text-3xl font-semibold text-emerald-700 tabular-nums">
            {loading ? '—' : upcomingTrips.length}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500">Upcoming Days</div>
          <div className="mt-2 font-display text-3xl font-semibold text-zinc-900 tabular-nums">
            {loading ? '—' : totalDays}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="text-xs font-medium text-zinc-500">Upcoming Travellers</div>
          <div className="mt-2 font-display text-3xl font-semibold text-zinc-900 tabular-nums">
            {loading ? '—' : totalTravellers}
          </div>
        </div>
      </div>

      {/* Upcoming Trips Section */}
      <section className="bg-white border border-zinc-200 rounded-xl">
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-900">
              Upcoming Trips
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select a trip to view or edit its day-wise itinerary.
            </p>
          </div>
          {trips.length > 0 && (
            <button
              type="button"
              onClick={onViewAllTrips}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>View all trips</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-16 rounded-lg bg-zinc-100 animate-pulse"
              />
            ))}
          </div>
        ) : upcomingTrips.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-semibold text-zinc-900">
              No upcoming trips scheduled
            </h3>
            <p className="text-sm text-zinc-600 mt-1 max-w-md mx-auto">
              Create your first trip in TripCanvas or ask Claude to plan one via the MCP server.
            </p>
            <button
              type="button"
              onClick={onCreateTrip}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Trip</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {upcomingTrips.map((trip) => {
              const days = getTripDurationDays(trip.start_date, trip.end_date);
              return (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => onOpenTrip(trip.id)}
                  className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-zinc-50/80 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-display text-sm font-semibold text-zinc-900 truncate">
                      {trip.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span className="text-zinc-700 font-medium">{trip.destination}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {formatDateRange(trip.start_date, trip.end_date)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {days} {days === 1 ? 'day' : 'days'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {trip.travellers} {trip.travellers === 1 ? 'traveller' : 'travellers'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <span className="font-mono text-xs font-medium text-zinc-800 tabular-nums">
                      {formatCurrency(trip.budget, trip.currency)}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                      <span>Itinerary</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
