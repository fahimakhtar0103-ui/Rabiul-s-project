import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { HardHat } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  key?: string;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    // Total wait time = 2.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      exit={{ opacity: 0, filter: "blur(10px)", scale: 1.05 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[9999]"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="flex flex-col items-center relative"
      >
        <div className="flex items-center gap-3 relative pb-2 overflow-hidden px-2">
          <motion.div
            initial={{ rotate: -15, opacity: 0, x: -20, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="bg-[#F97316] p-2 sm:p-2.5 rounded-xl shadow-lg shadow-[#F97316]/20 border border-[#F97316]/20">
              <HardHat className="text-white w-7 h-7 sm:w-8 sm:h-8" strokeWidth={2.5} />
            </div>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#334155] tracking-tight flex items-center">
            SK<span className="text-[#F97316] ml-2">Enterprises</span>
          </h1>

          {/* Subtle construction-orange accent animation */}
          <motion.div
            initial={{ x: "-101%" }}
            animate={{ x: "0%" }}
            transition={{ delay: 0.5, duration: 0.8, ease: "circOut" }}
            className="absolute bottom-0 left-0 right-0 h-1 bg-[#F97316] rounded-full origin-left"
          />
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-[#334155]/70 text-[10px] sm:text-xs font-semibold mt-4 tracking-wider uppercase text-center"
        >
          Smart Labour & Payroll Management
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
