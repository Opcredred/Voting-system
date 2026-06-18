import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import { Ballot, Candidate } from '../types';
import { Lock, Unlock, CheckCircle2, Copy, LogOut } from 'lucide-react';
import { ResultsVisualizer } from './ResultsVisualizer';

interface Props {
  category: string;
  onBack: () => void;
}

export function BallotInterface({ category, onBack }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [ballotState, setBallotState] = useState<Ballot | null>(null);
  const [selectedCaptain, setSelectedCaptain] = useState<string | null>(null);
  const [selectedViceCaptain, setSelectedViceCaptain] = useState<string | null>(null);
  const [justVotedHash, setJustVotedHash] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let currentToken = sessionStorage.getItem('votechain_token');
    socket.emit('register_ballot', { category, token: currentToken });

    socket.on('ballot_registered', ({ token: newToken, state }) => {
      currentToken = newToken;
      setToken(newToken);
      sessionStorage.setItem('votechain_token', newToken);
      setBallotState(state);
    });

    socket.on('ballot_authorized', (state: Ballot) => {
      setBallotState(state);
      setJustVotedHash(null);
      setSelectedCaptain(null);
      setSelectedViceCaptain(null);
    });

    socket.on('ballot_unlocked', (state: Ballot) => {
      setBallotState(state);
      setJustVotedHash(null);
      setSelectedCaptain(null);
      setSelectedViceCaptain(null);
    });

    socket.on('vote_success', ({ hash }) => {
      setJustVotedHash(hash);
      setBallotState((prev) => prev ? { ...prev, locked: true, hasVoted: true, authorized: false } : null);
    });

    socket.on('ballot_updated', (state: Ballot) => {
      if (currentToken && state.id === currentToken) {
        setBallotState(state);
      }
    });

    return () => {
      socket.off('ballot_registered');
      socket.off('ballot_authorized');
      socket.off('ballot_unlocked');
      socket.off('vote_success');
      socket.off('ballot_updated');
    };
  }, [category]);

  const handleVote = () => {
    if (!token || !selectedCaptain || !selectedViceCaptain) return;
    socket.emit('cast_vote', {
      token,
      captain: selectedCaptain,
      viceCaptain: selectedViceCaptain,
    });
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!token || !ballotState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <p className="text-neutral-500 font-mono text-sm animate-pulse">Initializing Secure Ballot...</p>
      </div>
    );
  }

  const isLocked = ballotState.locked;
  const isAuthorized = ballotState.authorized;
  const hasVoted = ballotState.hasVoted;
  const campaign = ballotState.campaign;

  const renderCandidateList = (candidates: Candidate[], selectedId: string | null, onSelect: (id: string) => void) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {candidates.map((c, i) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          disabled={!isAuthorized || isLocked}
          className={`relative p-6 border transition-all rounded-none text-left flex flex-col ${
            selectedId === c.id
              ? 'border-2 border-black bg-black text-white'
              : 'border-black hover:bg-gray-100 bg-white'
          } ${(!isAuthorized || isLocked) ? 'opacity-40 cursor-not-allowed border-dashed' : 'cursor-pointer'}`}
        >
          {selectedId === c.id && (
            <div className="absolute top-4 right-4 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white block"></span>
            </div>
          )}
          <span className="absolute top-2 right-4 text-4xl font-serif opacity-10">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="font-serif text-xl pr-4 leading-tight">{c.name}</div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="bg-[#F9F8F6] text-[#1A1A1A] w-full min-h-screen flex flex-col font-sans border-8 border-white p-4 md:p-12">
      <header className="flex flex-wrap justify-between items-end mb-12 border-b-2 border-black pb-4">
        <div>
          <button onClick={onBack} className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-60 mb-2 hover:opacity-100 flex items-center">&larr; Return to Home</button>
          <h1 className="text-4xl md:text-7xl font-serif italic tracking-tighter leading-none flex items-center gap-4">
            Ballot Terminal
            {isLocked ? <Lock strokeWidth={1} className="w-8 h-8 md:w-12 md:h-12" /> : <Unlock strokeWidth={1} className="w-8 h-8 md:w-12 md:h-12" />}
          </h1>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <div className="flex items-center justify-end gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${isLocked ? 'bg-red-500' : 'bg-green-500'}`}></span>
            <p className="text-[10px] uppercase tracking-widest font-bold">
               System Status: {isLocked ? (hasVoted ? 'Recorded' : 'Locked') : 'Operational'}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[9px] uppercase font-bold opacity-50 mb-1">Assigned Token</p>
            <div className="flex items-center gap-2 font-mono text-xl">
              <span className="tracking-widest">{token}</span>
              <button onClick={copyToken} className="hover:opacity-50" title="Copy Token">
                 <Copy size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full">
        {!isAuthorized && !hasVoted && (
          <div className="border border-black p-8 mb-12 flex flex-col items-center text-center opacity-70">
            <Lock className="mb-4" size={32} strokeWidth={1} />
            <h2 className="text-2xl font-serif mb-2 uppercase tracking-widest">Authorization Required</h2>
            <p className="text-[10px] uppercase tracking-wider font-bold max-w-md">
              Share token <span className="font-mono bg-black text-white px-2 py-1 mx-1.5">{token}</span> 
              with the Control Unit to securely unlock this terminal.
            </p>
          </div>
        )}

        {justVotedHash && (
          <div className="border-2 border-black p-8 mb-12 flex flex-col items-center text-center bg-white">
             <div className="flex items-center justify-center gap-4 mb-4">
               <span className="w-2 h-2 rounded-full bg-green-500"></span>
               <h2 className="text-2xl font-serif uppercase tracking-widest">Vote Registered</h2>
               <span className="w-2 h-2 rounded-full bg-green-500"></span>
             </div>
            <p className="text-[10px] uppercase tracking-wider font-bold mb-6">Vote irreversibly etched into the ledger.</p>
            <div className="w-full bg-black text-white p-4 font-mono text-[10px] break-all">
              TX_HASH: {justVotedHash}
            </div>
          </div>
        )}

        <section className={`transition-opacity duration-300 ${(isLocked && !isAuthorized) ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {ballotState.ended ? (
            <div className="border border-black p-12 text-center opacity-70">
              <h2 className="text-3xl font-serif text-red-600 mb-2 uppercase tracking-widest font-bold">Terminal Closed</h2>
              <p className="text-[10px] uppercase font-bold">This terminal has been permanently disconnected.</p>
            </div>
          ) : campaign?.finished && campaign?.results ? (
            <div className="border-t-2 border-black pt-12">
               <h2 className="text-3xl font-serif mb-6 uppercase tracking-widest text-center">Voting Concluded</h2>
               <div className="border border-black p-6 bg-[#F9F8F6] max-w-4xl mx-auto">
                 <ResultsVisualizer results={campaign.results} />
               </div>
            </div>
          ) : campaign?.finished ? (
            <div className="border border-black p-12 text-center opacity-70">
              <h2 className="text-3xl font-serif mb-2 uppercase tracking-widest font-bold">Waiting for Results...</h2>
            </div>
          ) : !campaign ? (
            <div className="border border-black border-dashed p-12 text-center opacity-50 font-serif">
              Awaiting Campaign Assignment...
            </div>
          ) : (
            <>
              <div className="mb-12">
                <h2 className="text-xs uppercase tracking-[0.3em] font-bold mb-6 flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-black"></span>
                  Captain Selection
                </h2>
                {renderCandidateList(campaign.captains, selectedCaptain, setSelectedCaptain)}
              </div>

              <div className="mb-12">
                <h2 className="text-xs uppercase tracking-[0.3em] font-bold mb-6 flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-black"></span>
                  Vice-Captain Selection
                </h2>
                {renderCandidateList(campaign.viceCaptains, selectedViceCaptain, setSelectedViceCaptain)}
              </div>

              <div className="flex justify-end pt-8 border-t-2 border-black">
                <button
                  onClick={handleVote}
                  disabled={!isAuthorized || !selectedCaptain || !selectedViceCaptain || isLocked}
                  className={`border border-black px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${
                    (!isAuthorized || !selectedCaptain || !selectedViceCaptain || isLocked)
                      ? 'opacity-40 cursor-not-allowed border-dashed'
                      : 'hover:bg-black hover:text-white cursor-pointer bg-white'
                  }`}
                >
                  Sign & Broadcast Vote
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
