/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RoleSelect } from './components/RoleSelect';
import { BallotInterface } from './components/BallotInterface';
import { ControlUnit } from './components/ControlUnit';
import { auth, signInWithGoogle, logOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [role, setRole] = useState<'ballot' | 'control_unit' | null>(() => {
    return sessionStorage.getItem('votechain_role') as any || null;
  });
  const [category, setCategory] = useState<string | null>(() => {
    return sessionStorage.getItem('votechain_category') || null;
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled. Please try again.');
      } else {
        setAuthError(err.message || 'An error occurred during sign in.');
      }
    }
  };

  const handleSelectRole = (selectedRole: 'ballot' | 'control_unit', selectedCategory?: string) => {
    setRole(selectedRole);
    sessionStorage.setItem('votechain_role', selectedRole);
    if (selectedCategory) {
      setCategory(selectedCategory);
      sessionStorage.setItem('votechain_category', selectedCategory);
    } else {
      setCategory(null);
      sessionStorage.removeItem('votechain_category');
    }
  };

  const handleClearRole = () => {
    setRole(null);
    setCategory(null);
    sessionStorage.removeItem('votechain_role');
    sessionStorage.removeItem('votechain_category');
    sessionStorage.removeItem('votechain_token');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans">
         <p className="text-[10px] uppercase tracking-[0.4em] font-bold animate-pulse">Initializing Secure Uplink...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F8F6] text-[#1A1A1A] p-4 font-sans">
        <div className="w-full max-w-xl p-8 md:p-12 border-8 border-white bg-[#F9F8F6] flex flex-col items-center text-center relative">
          <div className="mb-12 border-b-2 border-black pb-8 w-full">
            <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-60 mb-2">Blockchain Secure Network</p>
            <h1 className="text-5xl md:text-6xl font-serif italic tracking-tighter leading-none mb-4">VoteChain</h1>
          </div>
          
          <h2 className="text-xl font-serif mb-6">Identity Verification Required</h2>
          
          {window.self !== window.top && (
            <div className="mb-6 p-4 border border-blue-200 bg-blue-50 text-blue-900 text-sm italic text-left">
              <p>For the best experience and to prevent authentication issues, please open this app in a new tab.</p>
              <button onClick={() => window.open(window.location.href, '_blank')} className="mt-2 text-xs font-bold uppercase underline">Open in New Tab</button>
            </div>
          )}

          <button
            onClick={handleSignIn}
            className="flex items-center gap-3 border-2 border-black px-8 py-4 text-[10px] uppercase font-bold tracking-[0.2em] hover:bg-black hover:text-white transition-colors bg-white w-full justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Authenticate with Google
          </button>
          
          {authError && (
            <p className="mt-4 text-red-600 text-[10px] uppercase font-bold tracking-wider">{authError}</p>
          )}
        </div>
      </div>
    );
  }

  if (role === 'ballot') {
    return <BallotInterface category={category || 'Unknown'} onBack={handleClearRole} />;
  }

  if (role === 'control_unit') {
    return <ControlUnit onBack={handleClearRole} />;
  }

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-4 bg-white border border-black p-2 shadow-sm">
        <span className="text-[10px] font-mono opacity-60 truncate max-w-[150px]">{user.email}</span>
        <button onClick={logOut} className="text-[9px] uppercase tracking-wider font-bold hover:text-red-600 transition-colors">
          Sign Out
        </button>
      </div>
      <RoleSelect onSelectRole={handleSelectRole} />
    </div>
  );
}

