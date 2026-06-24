'use client';

import { useState } from 'react';
import { loginCitizen, registerCitizen } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Loader2, Fingerprint } from 'lucide-react';
import { INDIAN_STATES, getCitiesForState } from '@/lib/india-states-cities';

export default function CitizenLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [aadhar, setAadhar] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cities = state ? getCitiesForState(state) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (aadhar.length !== 12 || isNaN(Number(aadhar))) {
      setError("Please enter a valid 12-digit Aadhar number.");
      setIsSubmitting(false);
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setIsSubmitting(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    if (!isLogin && (!state || !city)) {
      setError("Please select your State and City.");
      setIsSubmitting(false);
      return;
    }

    if (isLogin) {
      const res = await loginCitizen(aadhar, password);
      if (!res.success) {
        setError(res.error || 'Failed to login');
        setIsSubmitting(false);
      } else {
        window.location.reload();
      }
    } else {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const res = await registerCitizen(aadhar, password, state, city, preferredLanguage);
      if (!res.success) {
        setError(res.error || 'Failed to register');
        setIsSubmitting(false);
      } else {
        window.location.reload();
      }
    }
  };

  const inputClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";
  const selectClass = "w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full mx-auto space-y-5">
      <div className="text-center">
        <Fingerprint className="w-14 h-14 text-blue-500 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-white mb-1">{isLogin ? 'Citizen Login' : 'Citizen Sign Up'}</h2>
        <p className="text-slate-400 text-sm">{isLogin ? 'Welcome back! Log in to report issues or check status.' : 'Verify your Aadhar and create your account.'}</p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-200">Aadhar Card Number</label>
          <input 
            type="text"
            maxLength={12}
            className={`${inputClass} tracking-widest text-center font-mono text-lg`}
            placeholder="XXXX XXXX XXXX"
            value={aadhar}
            onChange={(e) => setAadhar(e.target.value)}
          />
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-200">Password</label>
          <input 
            type="password"
            className={`${inputClass} text-center font-mono text-lg`}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {!isLogin && (
          <>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-200">Confirm Password</label>
              <input 
                type="password"
                className={`${inputClass} text-center font-mono text-lg`}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-200">State</label>
                <select
                  className={selectClass}
                  value={state}
                  onChange={(e) => { setState(e.target.value); setCity(''); }}
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-200">City</label>
                <select
                  className={selectClass}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!state}
                >
                  <option value="">Select City</option>
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 mt-3">
              <label className="text-sm font-medium text-slate-200">Preferred Language</label>
              <select
                className={selectClass}
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="bn">Bengali</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="mr">Marathi</option>
                <option value="gu">Gujarati</option>
                <option value="or">Odia</option>
                <option value="pa">Punjabi</option>
                <option value="ur">Urdu</option>
              </select>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-semibold text-lg transition-all active:scale-[0.98]"
        disabled={isSubmitting || aadhar.length < 12 || password.length < 6}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {isLogin ? 'Authenticating...' : 'Verifying Aadhar...'}
          </>
        ) : (
          isLogin ? 'Login' : 'Verify & Register'
        )}
      </Button>

      <div className="text-center pt-1">
        <button 
          type="button" 
          onClick={() => { setIsLogin(!isLogin); setError(null); }} 
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isLogin ? "Don't have an account? Sign Up" : "Already registered? Log In"}
        </button>
      </div>
    </form>
  );
}
