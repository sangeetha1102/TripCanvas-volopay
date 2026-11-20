import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, ArrowRight, Search, Plus, Map } from 'lucide-react';
import type { Trip } from '../types';
import {
  formatCurrency,
  formatDateRange,
  getTripDurationDays,
  isUpcomingTrip,
} from '../lib/format';

interface TripsViewProps {
  trips: Trip[];
  loading: boolean;
  onOpenTrip: (tripId: string) => void;
  onCreateTrip: () => void;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (trip: Trip) => void;
}

export function TripsView({
  trips,
  loading,
  onOpenTrip,
  onCreateTrip,
  onEditTrip,
  onDeleteTrip,
}: TripsViewProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  const filteredTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((trip) => {
      const upcoming = isUpcomingTrip(trip.end_date);
      if (filter === 'upcoming' && !upcoming) return false;
      if (filter === 'past' && upcoming) return false;
      if (!q) return true;
      return (
        trip.name.toLowerCase().includes(q) ||
        trip.destination.toLowerCase().includes(q)
      );
    });
  }, [trips, search, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
            My Trips
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Create, manage, and open day-wise itineraries for your travels.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateTrip}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Trip</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-zinc-200/70 rounded-lg self-start">
          {(['all', 'upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap cursor-pointer ${
                filter === tab
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by trip or destination..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
          />
        </div>
      </div>

      {/* Trips Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="h-44 bg-white border border-zinc-200 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <Map className="w-5 h-5" />
          </div>
          <h3 className="font-display text-base font-semibold text-zinc-900">
            {trips.length === 0 ? 'No trips yet' : 'No matching trips'}
          </h3>
          <p className="text-sm text-zinc-600 mt-1 max-w-sm mx-auto">
            {trips.length === 0
              ? 'Add your first trip with destination, dates, travellers, and budget.'
              : 'Try adjusting your search query or switching the date filter.'}
          </p>
          {trips.length === 0 && (
            <button
              type="button"
              onClick={onCreateTrip}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Trip</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrips.map((trip) => {
            const days = getTripDurationDays(trip.start_date, trip.end_date);
            const upcoming = isUpcomingTrip(trip.end_date);
            return (
              <div
                key={trip.id}
                className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between gap-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display text-lg font-semibold text-zinc-900 truncate">
                        {trip.name}
                      </h2>
                      <p className="text-sm text-zinc-600 mt-0.5 truncate">
                        {trip.destination}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium shrink-0 ${
                        upcoming ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    >
                      {upcoming ? 'Upcoming' : 'Past'}
                    </span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-100 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-zinc-500">Dates</div>
                      <div className="mt-1 font-medium text-zinc-900 tabular-nums">
                        {formatDateRange(trip.start_date, trip.end_date)}
                      </div>
                      <div className="text-zinc-500 tabular-nums mt-0.5">
                        {days} {days === 1 ? 'day' : 'days'}
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-500">Travellers</div>
                      <div className="mt-1 font-medium text-zinc-900 tabular-nums">
                        {trip.travellers} {trip.travellers === 1 ? 'person' : 'people'}
                      </div>
                    </div>

                    <div>
                      <div className="text-zinc-500">Budget</div>
                      <div className="mt-1 font-mono font-medium text-zinc-900 tabular-nums">
                        {formatCurrency(trip.budget, trip.currency)}
                      </div>
                      <div className="text-zinc-500 mt-0.5">{trip.currency}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenTrip(trip.id)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <span>Open Itinerary</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditTrip(trip)}
                      className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                      aria-label={`Edit ${trip.name}`}
                      title="Edit trip"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTrip(trip)}
                      className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      aria-label={`Delete ${trip.name}`}
                      title="Delete trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
