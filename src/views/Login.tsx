import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { HardHat, LogIn, Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Check your email for the password reset link.');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Check your email to verify your account.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-surface-bright rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden"
      >
        <div className="p-8 text-center bg-primary/5 border-b border-outline-variant/20">
          <div className="flex justify-center mb-4">
            <div className="bg-[#F97316] p-3 rounded-xl shadow-lg shadow-[#F97316]/20">
              <HardHat className="text-white w-8 h-8" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-on-surface tracking-tight flex items-center justify-center">
            SK<span className="text-[#F97316] ml-2">Enterprises</span>
          </h1>
          <p className="text-sm font-semibold mt-2 tracking-wider text-on-surface-variant uppercase">
            {isForgotPassword ? 'Reset Password' : isLogin ? 'Sign In' : 'Create Account'}
          </p>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-error/10 border border-error/20 text-error rounded-lg flex items-start gap-2 text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}
            {message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-3 bg-success/10 border border-success/20 text-success rounded-lg flex items-start gap-2 text-sm font-medium"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1.5 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-outline-variant rounded-xl text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-4 rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isForgotPassword ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Sign Up'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-3 text-center space-y-2 text-sm font-medium text-on-surface-variant pt-6 border-t border-outline-variant/30">
            {isForgotPassword ? (
              <button onClick={() => setIsForgotPassword(false)} className="text-primary hover:underline font-bold transition-all">
                Back to Sign In
              </button>
            ) : (
              <>
                <button onClick={() => setIsForgotPassword(true)} className="hover:text-primary hover:underline transition-all">
                  Forgot your password?
                </button>
                <div className="flex items-center justify-center gap-1">
                  <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
                  <button 
                    onClick={() => setIsLogin(!isLogin)} 
                    className="text-primary font-bold hover:underline transition-all"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
