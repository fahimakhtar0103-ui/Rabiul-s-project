import { Bell, ArrowLeft } from 'lucide-react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export function Header({ currentView, onNavigate }: Readonly<HeaderProps>) {
  const isInternal = currentView === 'payment' || currentView === 'profile';

  return (
    <header className="flex justify-between items-center px-4 h-16 w-full z-50 bg-surface-bright border-b border-outline-variant sticky top-0 left-0 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3">
        {isInternal ? (
          <>
            <button
              onClick={() => onNavigate('labours')}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low active:bg-surface-container transition-colors -ml-2"
            >
              <ArrowLeft className="text-on-surface w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-on-surface tracking-tight">
              {currentView === 'profile' ? 'Profile Summary' : 'Payment Entry'}
            </h1>
          </>
        ) : (
          <>
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/30">
               <span className="text-sm">R</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-on-surface tracking-tight leading-none mb-0.5">LabourFlow</h1>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider leading-none">Raju Contractors</p>
            </div>
          </>
        )}
      </div>
      
      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors rounded-full relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border border-surface-bright" />
        </button>
      </div>
    </header>
  );
}
