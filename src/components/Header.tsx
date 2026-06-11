import { useState } from 'react';
import { Bell, ArrowLeft, CheckCircle2, LogOut } from 'lucide-react';
import { ViewState } from '../types';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export function Header({ currentView, onNavigate }: Readonly<HeaderProps>) {
  const isInternal = currentView === 'payment' || currentView === 'profile';
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="flex justify-between items-center px-4 h-16 w-full z-50 bg-surface-bright border-b border-outline-variant sticky top-0 left-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)] print:hidden">
      <div className="flex items-center gap-3">
        {isInternal ? (
          <>
            <button
              onClick={() => onNavigate('labours')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low active:bg-surface-container transition-colors -ml-2"
            >
              <ArrowLeft className="text-on-surface w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-on-surface tracking-tight truncate">
              {currentView === 'profile' ? 'Profile Summary' : 'Payment Entry'}
            </h1>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/30">
               <span className="text-sm">SK</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-on-surface tracking-tight leading-none mb-0.5">SK Enterprises</h1>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider leading-none">Business Profile</p>
            </div>
          </>
        )}
      </div>
      
      {/* Right Actions */}
      <div className="flex items-center gap-2 relative">
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors rounded-full relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-surface-bright" />
        </button>
        <button 
          onClick={async () => await supabase.auth.signOut()}
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors rounded-full relative"
          title="Sign Out"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {showNotifications && (
          <div className="absolute top-12 right-0 w-64 bg-surface-bright rounded-lg shadow-xl border border-outline-variant/30 py-2 z-50">
            <div className="px-4 py-2 border-b border-outline-variant/30">
              <h3 className="text-sm font-bold text-on-surface">Notifications</h3>
            </div>
            <div className="p-4 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-on-surface">You're all caught up!</p>
              <p className="text-xs text-on-surface-variant">No new notifications.</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
