import {
  LayoutDashboard,
  ClipboardList,
  Users,
  IndianRupee,
  BarChart3,
} from 'lucide-react';
import { ViewState } from '../types';

interface BottomNavProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export function BottomNav({ currentView, onNavigate }: Readonly<BottomNavProps>) {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'settlement', icon: ClipboardList, label: 'Settlement' },
    { id: 'labours', icon: Users, label: 'Labours' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center bg-surface-bright h-[68px] px-2 border-t border-outline-variant shadow-[0_-4px_10px_rgba(0,0,0,0.03)] pb-safe">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id || (item.id === 'labours' && currentView === 'profile') || (item.id === 'labours' && currentView === 'payment');
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as ViewState)}
            className={`flex flex-col items-center justify-center w-full h-full relative transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-on-surface-variant'
            }`}
          >
            <div className={`p-1.5 rounded-full mb-1 transition-all ${isActive ? 'bg-primary/10' : 'bg-transparent'}`}>
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className={`text-[10px] uppercase tracking-wider leading-none ${isActive ? 'font-bold' : 'font-semibold'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
