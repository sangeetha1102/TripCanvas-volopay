import React, { useState } from 'react';
import {
  Compass,
  LayoutDashboard,
  Map,
  KeyRound,
  LogOut,
  Plus,
  Menu,
  X,
} from 'lucide-react';

export type NavSection = 'dashboard' | 'trips' | 'mcp';

interface LayoutProps {
  activeSection: NavSection;
  breadcrumb: string;
  userEmail: string;
  onNavigate: (section: NavSection) => void;
  onNewTrip: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function Layout({
  activeSection,
  breadcrumb,
  userEmail,
  onNavigate,
  onNewTrip,
  onSignOut,
  children,
}: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'trips', label: 'My Trips', icon: Map },
    { id: 'mcp', label: 'MCP Access', icon: KeyRound },
  ];

  const handleSelectNav = (id: NavSection) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-zinc-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-zinc-200">
        <div className="h-16 px-6 flex items-center gap-2.5 border-b border-zinc-200">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-display font-semibold text-base tracking-tight text-zinc-900 whitespace-nowrap">
            TripCanvas
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-emerald-700' : 'text-zinc-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <div className="px-3 py-2 mb-1">
            <div className="text-xs font-medium text-zinc-900 truncate">{userEmail}</div>
            <div className="text-xs text-zinc-500">Signed in</div>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/30"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white border-r border-zinc-200 flex flex-col z-50">
            <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-200">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="font-display font-semibold text-base text-zinc-900">
                  TripCanvas
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-emerald-700' : 'text-zinc-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-zinc-200">
              <div className="px-3 py-1.5 text-xs text-zinc-700 truncate">{userEmail}</div>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-50 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-zinc-600 hover:text-zinc-900 rounded-lg cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-zinc-600 truncate">{breadcrumb}</div>
          </div>

          <button
            type="button"
            onClick={onNewTrip}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Trip</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
