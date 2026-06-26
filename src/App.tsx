import { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { ViewState, Worker } from './types';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './views/Dashboard';
import { LabourList } from './views/LabourList';
import { Settlement } from './views/Settlement';
import { Payment } from './views/Payment';
import { Profile } from './views/Profile';
import { Reports } from './views/Reports';
import { SiteManagement } from './views/SiteManagement';
import { SplashScreen } from './components/SplashScreen';
import { Login } from './views/Login';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch(err => {
      console.error("Failed to get session:", err);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && !session && (
        <Login />
      )}

      {!showSplash && session && (
        <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col relative w-full overflow-x-hidden">
          <Header currentView={currentView} onNavigate={handleNavigate} />
          
          <main className="flex-1 w-full max-w-full overflow-x-hidden relative">
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
            {currentView === 'sites' && <SiteManagement />}
          </main>

          {/* Hide bottom nav on internal deeply nested pages like payment or profile to focus task */}
          {(currentView !== 'payment' && currentView !== 'profile') && (
            <BottomNav currentView={currentView} onNavigate={handleNavigate} />
          )}
        </div>
      )}
    </>
  );
}

