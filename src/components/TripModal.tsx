import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Trip, TripFormValues } from '../types';

const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'];

interface TripModalProps {
  open: boolean;
  initialTrip?: Trip | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (values: TripFormValues) => Promise<void>;
}

export function TripModal({
  open,
  initialTrip,
  saving = false,
  onClose,
  onSave,
}: TripModalProps) {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travellers, setTravellers] = useState(2);
  const [budget, setBudget] = useState(1500);
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialTrip) {
      setName(initialTrip.name);
      setDestination(initialTrip.destination);
      setStartDate(initialTrip.start_date);
      setEndDate(initialTrip.end_date);
      setTravellers(initialTrip.travellers);
      setBudget(initialTrip.budget);
      setCurrency(initialTrip.currency || 'USD');
    } else {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 86400000);
      const nextWeekEnd = new Date(today.getTime() + 10 * 86400000);
      const toIso = (d: Date) => d.toISOString().slice(0, 10);
      setName('');
      setDestination('');
      setStartDate(toIso(nextWeek));
      setEndDate(toIso(nextWeekEnd));
      setTravellers(2);
      setBudget(1500);
      setCurrency('USD');
    }
  }, [open, initialTrip]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !destination.trim()) {
      setError('Trip name and destination are required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after start date.');
      return;
    }
    if (travellers < 1) {
      setError('Travellers must be at least 1.');
      return;
    }
    if (budget < 0) {
      setError('Budget cannot be negative.');
      return;
    }

    try {
      await onSave({
        name: name.trim(),
        destination: destination.trim(),
        start_date: startDate,
        end_date: endDate,
        travellers: Number(travellers),
        budget: Number(budget),
        currency,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save trip.');
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
            {initialTrip ? 'Edit Trip' : 'Create New Trip'}
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
          <div>
            <label htmlFor="trip-name" className="block text-xs font-medium text-zinc-700 mb-1.5">
              Trip name
            </label>
            <input
              id="trip-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Goa Coastal Escape"
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="trip-destination"
              className="block text-xs font-medium text-zinc-700 mb-1.5"
            >
              Destination
            </label>
            <input
              id="trip-destination"
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Goa, India"
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="trip-start-date"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Start date
              </label>
              <input
                id="trip-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
            <div>
              <label
                htmlFor="trip-end-date"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                End date
              </label>
              <input
                id="trip-end-date"
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="trip-travellers"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Travellers
              </label>
              <input
                id="trip-travellers"
                type="number"
                min={1}
                required
                value={travellers}
                onChange={(e) => setTravellers(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="trip-budget"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Budget
              </label>
              <input
                id="trip-budget"
                type="number"
                min={0}
                step="0.01"
                required
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label
                htmlFor="trip-currency"
                className="block text-xs font-medium text-zinc-700 mb-1.5"
              >
                Currency
              </label>
              <select
                id="trip-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-700"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
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
              {saving ? 'Saving...' : initialTrip ? 'Save Changes' : 'Create Trip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
