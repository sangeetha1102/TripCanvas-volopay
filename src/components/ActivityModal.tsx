import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Activity, ActivityFormValues } from '../types';
import { normalizeTimeForInput } from '../lib/format';

interface ActivityModalProps {
  open: boolean;
  initialActivity?: Activity | null;
  defaultDay?: number;
  maxDay?: number;
  saving?: boolean;
  onClose: () => void;
  onSave: (values: ActivityFormValues) => Promise<void>;
}

export function ActivityModal({
  open,
  initialActivity,
  defaultDay = 1,
  maxDay = 30,
  saving = false,
  onClose,
  onSave,
}: ActivityModalProps) {
  const [day, setDay] = useState(defaultDay);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialActivity) {
      setDay(initialActivity.day);
      setTitle(initialActivity.title);
      setLocation(initialActivity.location || '');
      setTime(normalizeTimeForInput(initialActivity.time) || initialActivity.time || '');
      setNotes(initialActivity.notes || '');
    } else {
      setDay(defaultDay);
      setTitle('');
      setLocation('');
      setTime('09:00');
      setNotes('');
    }
  }, [open, initialActivity, defaultDay]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Activity title is required.');
      return;
    }
    if (day < 1) {
      setError('Day must be 1 or greater.');
      return;
    }

    try {
      await onSave({
        day: Number(day),
        title: title.trim(),
        location: location.trim(),
        time: time.trim(),
        notes: notes.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save activity.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-zinc-900">
            {initialActivity ? 'Edit Activity' : 'Add Itinerary Activity'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="act-day" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Day
              </label>
              <input
                id="act-day"
                type="number"
                min={1}
                max={Math.max(maxDay, 60)}
                required
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label htmlFor="act-time" className="block text-xs font-medium text-zinc-700 mb-1.5">
                Time
              </label>
              <input
                id="act-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="act-title" className="block text-xs font-medium text-zinc-700 mb-1.5">
              Activity title
            </label>
            <input
              id="act-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Palolem Beach Sunrise Walk"
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="act-location"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Location
            </label>
            <input
              id="act-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Palolem Beach, South Goa"
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div>
            <label htmlFor="act-notes" className="block text-xs font-medium text-zinc-700 mb-1.5">
              Notes
            </label>
            <textarea
              id="act-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reservation details, packing reminders, or meeting point..."
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : initialActivity ? 'Save Activity' : 'Add Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
