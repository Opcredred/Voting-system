import React, { useState } from 'react';
import { User, MonitorCheck } from 'lucide-react';

interface Props {
  onSelectRole: (role: 'ballot' | 'control_unit', category?: string) => void;
}

const CATEGORIES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'CIE'];

export function RoleSelect({ onSelectRole }: Props) {
  const [showCategories, setShowCategories] = useState(false);

  if (showCategories) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F8F6] text-[#1A1A1A] p-4 font-sans">
        <div className="w-full max-w-4xl p-8 md:p-12 border-8 border-white bg-[#F9F8F6] flex flex-col items-center">
          <div className="text-center mb-12 border-b-2 border-black pb-8 w-full">
            <button onClick={() => setShowCategories(false)} className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-60 mb-6 hover:opacity-100 flex items-center justify-center w-full">&larr; Back to Role Selection</button>
            <h1 className="text-4xl md:text-5xl font-serif italic tracking-tighter leading-none mb-4">Select Category</h1>
            <p className="text-sm font-serif italic opacity-80">
              Specify the grade for this ballot terminal.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => onSelectRole('ballot', category)}
                className="p-6 bg-transparent border-2 border-black hover:bg-black hover:text-white transition-colors text-center font-serif text-xl"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9F8F6] text-[#1A1A1A] p-4 font-sans">
      <div className="w-full max-w-4xl p-8 md:p-12 border-8 border-white bg-[#F9F8F6] flex flex-col items-center">
        <div className="text-center mb-16 border-b-2 border-black pb-8 w-full">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-60 mb-2">Blockchain Secure Network</p>
          <h1 className="text-6xl md:text-7xl font-serif italic tracking-tighter leading-none mb-4">VoteChain</h1>
          <p className="text-sm font-serif italic opacity-80">
            Select your operating interface to commence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 w-full">
          <button
            onClick={() => setShowCategories(true)}
            className="flex flex-col items-start p-8 bg-transparent border-2 border-black hover:bg-black hover:text-white transition-colors text-left group rounded-none"
          >
            <div className="mb-8 border border-current p-4 rounded-none">
              <User size={32} strokeWidth={1} />
            </div>
            <h2 className="text-2xl font-serif mb-2">Voting Terminal</h2>
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              Generate token & cast ballot
            </p>
          </button>

          <button
            onClick={() => onSelectRole('control_unit')}
            className="flex flex-col items-start p-8 bg-transparent border-2 border-black hover:bg-black hover:text-white transition-colors text-left group rounded-none"
          >
            <div className="mb-8 border border-current p-4 rounded-none">
              <MonitorCheck size={32} strokeWidth={1} />
            </div>
            <h2 className="text-2xl font-serif mb-2">Central Ledger</h2>
            <p className="text-[10px] uppercase tracking-wider font-bold opacity-60 group-hover:opacity-100 transition-opacity">
              Manage ballots & view blockchain
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
