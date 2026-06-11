import { useState, useEffect } from 'react';
import { ViewState, Worker } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './views/Dashboard';
import { LabourList } from './views/LabourList';
import { Settlement } from './views/Settlement';
import { Payment } from './views/Payment';
import { Profile } from './views/Profile';
import { Reports } from './views/Reports';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);

  // Smooth scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  const handleNavigate = (view: ViewState | string, context?: any) => {
    if (view === 'profile' || view === 'payment') {
      if (context) {
        setSelectedWorker(context as Worker);
      }
      setCurrentView('profile'); // Send all to profile since we handle payments inside it now.
    } else {
      setCurrentView(view as any);
    }
  };

  const handlePaymentSuccess = () => {
    // Optionally update local state here if building full functionality.
    // Return to previous contextual view or labours list.
    alert('Payment successful!');
    handleNavigate(selectedWorker ? 'profile' : 'labours', selectedWorker);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col relative w-full overflow-x-hidden">
      <Header currentView={currentView} onNavigate={handleNavigate} />
      
      <main className="flex-grow flex flex-col items-stretch w-full relative">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'settlement' && <Settlement />}
        {currentView === 'labours' && <LabourList onNavigate={handleNavigate} />}
        {currentView === 'payment' && (
          <Payment 
            onSuccess={handlePaymentSuccess} 
            worker={selectedWorker} 
          />
        )}
        {currentView === 'profile' && (
          <Profile 
            worker={selectedWorker} 
            onNavigate={handleNavigate} 
          />
        )}
        {currentView === 'reports' && (
          <Reports />
        )}
        {/* Fillers for unimplemented tabs to prevent blank screens if clicked */}
        {(currentView === 'sites') && (
           <div className="flex-grow flex items-center justify-center p-8 text-on-surface-variant italic text-sm">
              View coming soon.
           </div>
        )}
      </main>

      {/* Hide bottom nav on internal deeply nested pages like payment or profile to focus task */}
      {(currentView !== 'payment' && currentView !== 'profile') && (
        <BottomNav currentView={currentView} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

