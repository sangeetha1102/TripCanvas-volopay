import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  MapPin,
  Clock,
} from 'lucide-react';
import type { Activity, Trip, TripWithActivities } from '../types';
import {
  formatCurrency,
  formatDateRange,
  formatDisplayTime,
  getDateForTripDay,
  getTripDurationDays,
  timeToSortMinutes,
} from '../lib/format';

interface ItineraryViewProps {
  trip: TripWithActivities | null;
  loading: boolean;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onEditTrip: (trip: Trip) => void;
  onAddActivity: (day: number) => void;
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (activity: Activity) => void;
}

export function ItineraryView({
  trip,
  loading,
  refreshing,
  onBack,
  onRefresh,
  onEditTrip,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: ItineraryViewProps) {
  const dayGroups = useMemo(() => {
    if (!trip) return [];
    const durationDays = getTripDurationDays(trip.start_date, trip.end_date);
    const maxActivityDay = trip.activities.reduce(
      (max, act) => Math.max(max, act.day),
      0
    );
    const totalDays = Math.max(durationDays, maxActivityDay, 1);

    const grouped = new Map<number, Activity[]>();
    for (let d = 1; d <= totalDays; d += 1) {
      grouped.set(d, []);
    }
    for (const act of trip.activities) {
      const list = grouped.get(act.day) ?? [];
      list.push(act);
      grouped.set(act.day, list);
    }

    return Array.from(grouped.entries()).map(([day, items]) => ({
      day,
      dateLabel: getDateForTripDay(trip.start_date, day),
      activities: [...items].sort(
        (a, b) => timeToSortMinutes(a.time) - timeToSortMinutes(b.time)
      ),
    }));
  }, [trip]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-white border border-zinc-200 rounded-xl animate-pulse" />
        <div className="h-64 bg-white border border-zinc-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
        <p className="text-sm text-zinc-600">Trip not found.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Trips</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Trips</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => onEditTrip(trip)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Trip</span>
          </button>
          <button
            type="button"
            onClick={() => onAddActivity(1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Trip Summary Header */}
      <section className="bg-white border border-zinc-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900">
              {trip.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">{trip.destination}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {formatDateRange(trip.start_date, trip.end_date)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {trip.travellers} {trip.travellers === 1 ? 'traveller' : 'travellers'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-zinc-800 tabular-nums">
                {formatCurrency(trip.budget, trip.currency)} ({trip.currency})
              </span>
            </div>
          </div>

          <div className="text-left md:text-right">
            <div className="text-xs text-zinc-500">Trip ID</div>
            <div className="font-mono text-xs text-zinc-700 select-all mt-0.5">{trip.id}</div>
          </div>
        </div>
      </section>

      {/* Day-Wise Itinerary Sections */}
      <div className="space-y-4">
        {dayGroups.map((group) => (
          <section
            key={group.day}
            className="bg-white border border-zinc-200 rounded-xl overflow-hidden"
          >
            <div className="px-6 py-3.5 bg-zinc-50/70 border-b border-zinc-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-sm font-semibold text-zinc-900 tabular-nums">
                  Day {group.day}
                </h2>
                <span aria-hidden="true" className="text-zinc-300">
                  ·
                </span>
                <span className="text-xs text-zinc-500">{group.dateLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => onAddActivity(group.day)}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Activity</span>
              </button>
            </div>

            {group.activities.length === 0 ? (
              <div className="px-6 py-6 flex items-center justify-between gap-4 text-xs text-zinc-500">
                <span>No activities planned for Day {group.day} yet.</span>
                <button
                  type="button"
                  onClick={() => onAddActivity(group.day)}
                  className="text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                >
                  Schedule one
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {group.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-zinc-50/60 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onEditActivity(activity)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-zinc-800 bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-800 px-2.5 py-1 rounded-md tabular-nums shrink-0 self-start transition-colors cursor-pointer"
                        title="Click to edit activity time or details"
                      >
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{formatDisplayTime(activity.time)}</span>
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="font-display text-sm font-semibold text-zinc-900">
                          {activity.title}
                        </div>

                        {activity.location && (
                          <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-zinc-600">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{activity.location}</span>
                          </div>
                        )}

                        {activity.notes && (
                          <p className="mt-1.5 text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                            {activity.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-start">
                      <button
                        type="button"
                        onClick={() => onEditActivity(activity)}
                        className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        aria-label={`Edit ${activity.title}`}
                        title="Edit activity"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteActivity(activity)}
                        className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        aria-label={`Delete ${activity.title}`}
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
