import React, { useEffect, useState } from 'react';
import { socket } from '../socket';
import { Ballot, Block, Campaign, Candidate } from '../types';
import { ShieldCheck, Unlock, Lock, Search, RefreshCw, Hash, LogOut, Plus } from 'lucide-react';
import { initAuth, googleSignIn, getAccessToken } from '../lib/auth';

import { ResultsVisualizer } from './ResultsVisualizer';

interface Props {
  onBack: () => void;
}

const FinishCampaignButton = ({ campaign, onFinish }: { campaign: Campaign, onFinish: (id: string) => void }) => {
  const [clicks, setClicks] = useState(0);
  const texts = ["Finish Campaign", "Are you absolutely sure?", "Confirm Finish (Irreversible)"];
  
  if (campaign.finished) {
    return <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-4 py-2 border border-gray-300">Finished</span>;
  }
  
  return (
    <button 
      onClick={(e) => {
        e.preventDefault();
        if (clicks === 2) {
          onFinish(campaign.id);
          setClicks(0);
        } else {
          setClicks(c => c + 1);
        }
      }} 
      className={`px-4 py-2 text-[10px] uppercase font-bold transition-colors ${clicks > 0 ? 'bg-red-800' : 'bg-red-600'} hover:bg-red-900 text-white border border-red-900`}
    >
      {texts[clicks]}
    </button>
  );
};

export function ControlUnit({ onBack }: Props) {
  const [cuId] = useState(() => {
    let id = localStorage.getItem('cuId');
    if (!id) {
       id = 'cu_' + Math.random().toString(36).substring(2, 9);
       localStorage.setItem('cuId', id);
    }
    return id;
  });
  const [activeCuCount, setActiveCuCount] = useState(1);
  const [allBallots, setAllBallots] = useState<Ballot[]>([]);
  const [blockchain, setBlockchain] = useState<Block[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [inputToken, setInputToken] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create Campaign State
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCaptains, setNewCaptains] = useState<string[]>(Array(6).fill(''));
  const [newViceCaptains, setNewViceCaptains] = useState<string[]>(Array(6).fill(''));

  useEffect(() => {
    socket.emit('register_control_unit', cuId);

    socket.on('control_unit_registered', (data: { ballots: Ballot[], blockchain: Block[], campaigns: Campaign[] }) => {
      setAllBallots(data.ballots);
      setBlockchain(data.blockchain);
      setCampaigns(data.campaigns || []);
    });

    socket.on('active_cu_count', (count: number) => {
      setActiveCuCount(count);
    });

    socket.on('campaigns_updated', (updatedCampaigns: Campaign[]) => {
      setCampaigns(updatedCampaigns);
    });

    socket.on('ballot_list_updated', (updatedBallots: Ballot[]) => {
      setAllBallots(updatedBallots);
    });

    socket.on('new_vote_recorded', (block: Block) => {
      setBlockchain((prev) => [...prev, block]);
    });

    socket.on('error_message', (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3000);
    });

    return () => {
      socket.off('control_unit_registered');
      socket.off('active_cu_count');
      socket.off('campaigns_updated');
      socket.off('ballot_list_updated');
      socket.off('new_vote_recorded');
      socket.off('error_message');
    };
  }, []);

  const handleAuthorize = (e: React.FormEvent) => {
    e.preventDefault();
    const token = inputToken.trim().toUpperCase();
    if (token.length === 6 && selectedCampaignId) {
      socket.emit('authorize_ballot', { token, campaignId: selectedCampaignId, cuId });
      setInputToken('');
    } else if (!selectedCampaignId) {
      setErrorMsg('Please select a campaign first.');
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName || newCaptains.some(c => !c.trim()) || newViceCaptains.some(c => !c.trim())) {
       setErrorMsg('Please fill out all fields for the new campaign.');
       setTimeout(() => setErrorMsg(null), 3000);
       return;
    }
    
    const newCampaign: Campaign = {
      id: 'cmp_' + Date.now().toString(),
      name: newCampaignName,
      captains: newCaptains.map((name, i) => ({ id: `c_${i}`, name: name.trim() })),
      viceCaptains: newViceCaptains.map((name, i) => ({ id: `vc_${i}`, name: name.trim() }))
    };

    socket.emit('create_campaign', newCampaign);
    setIsCreatingCampaign(false);
    setNewCampaignName('');
    setNewCaptains(Array(6).fill(''));
    setNewViceCaptains(Array(6).fill(''));
  };

  const visibleBallots = allBallots.filter(b => b.cuId === cuId);

  const unlockBallot = (token: string) => {
    socket.emit('unlock_ballot', token);
  };

  return (
    <div className="bg-[#F9F8F6] text-[#1A1A1A] w-full min-h-screen flex flex-col font-sans border-8 border-white p-4 md:p-12 overflow-y-auto">
      <header className="flex justify-between items-end mb-12 border-b-2 border-black pb-4 flex-wrap gap-4">
        <div>
          <button onClick={onBack} className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-60 mb-2 hover:opacity-100 flex items-center">&larr; Return to Home</button>
          <h1 className="text-4xl md:text-7xl font-serif italic tracking-tighter leading-none flex items-center gap-4">
            VoteChain
            <ShieldCheck strokeWidth={1} className="w-8 h-8 md:w-12 md:h-12" />
          </h1>
        </div>
        <div className="text-right flex-1 min-w-[300px]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <p className="text-[10px] uppercase tracking-widest font-bold">System Status: Operational</p>
            <span className="text-[10px] uppercase font-bold ml-4 border border-black px-2 py-0.5">CUs Active: {activeCuCount}</span>
          </div>
          <p className="text-2xl font-serif">Control Unit <span className="text-sm italic font-sans opacity-60">CU-8842-X</span></p>
          
          <button 
            onClick={() => setIsCreatingCampaign(!isCreatingCampaign)}
            className="mt-4 border border-black px-4 py-2 text-[10px] uppercase font-bold hover:bg-black hover:text-white transition-colors bg-white inline-flex items-center gap-2"
          >
             {isCreatingCampaign ? 'Cancel Campaign Creation' : <><Plus size={14} /> Create Election Campaign</>}
          </button>
        </div>
      </header>

      {isCreatingCampaign && (
        <main className="flex-1 w-full max-w-7xl mx-auto mb-12 border-2 border-black bg-white p-8">
           <h2 className="text-2xl font-serif mb-6 uppercase tracking-widest border-b border-black pb-4">Configure New Election Campaign</h2>
           <form onSubmit={handleCreateCampaign} className="space-y-8">
              <div>
                 <label className="block text-[10px] uppercase font-bold mb-2">Campaign Name (e.g. MS Student Council)</label>
                 <input 
                    type="text" 
                    value={newCampaignName} 
                    onChange={e => setNewCampaignName(e.target.value)}
                    className="w-full border border-black p-3 font-serif text-xl focus:outline-none focus:ring-1 focus:ring-black rounded-none"
                    placeholder="Enter campaign title..."
                 />
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                 <div>
                    <h3 className="text-xs uppercase font-bold mb-4 flex items-center gap-2"><span className="w-4 h-[1px] bg-black"></span> 6 Captain Candidates</h3>
                    <div className="space-y-3">
                       {newCaptains.map((name, i) => (
                         <div className="flex items-center gap-3" key={`c_input_${i}`}>
                            <span className="text-xs font-mono opacity-50">{i + 1}.</span>
                            <input 
                              type="text" 
                              value={name} 
                              onChange={(e) => {
                                const newArr = [...newCaptains];
                                newArr[i] = e.target.value;
                                setNewCaptains(newArr);
                              }}
                              className="flex-1 border-b border-black border-dashed p-2 font-serif focus:outline-none focus:border-solid rounded-none"
                              placeholder={`Candidate ${i + 1} Name`}
                            />
                         </div>
                       ))}
                    </div>
                 </div>
                 <div>
                    <h3 className="text-xs uppercase font-bold mb-4 flex items-center gap-2"><span className="w-4 h-[1px] bg-black"></span> 6 Vice-Captain Candidates</h3>
                    <div className="space-y-3">
                       {newViceCaptains.map((name, i) => (
                         <div className="flex items-center gap-3" key={`vc_input_${i}`}>
                            <span className="text-xs font-mono opacity-50">{i + 1}.</span>
                            <input 
                              type="text" 
                              value={name} 
                              onChange={(e) => {
                                const newArr = [...newViceCaptains];
                                newArr[i] = e.target.value;
                                setNewViceCaptains(newArr);
                              }}
                              className="flex-1 border-b border-black border-dashed p-2 font-serif focus:outline-none focus:border-solid rounded-none"
                              placeholder={`Candidate ${i + 1} Name`}
                            />
                         </div>
                       ))}
                    </div>
                 </div>
              </div>

              {errorMsg && <p className="text-red-500 text-[10px] uppercase font-bold">{errorMsg}</p>}

              <div className="flex justify-end pt-4">
                 <button type="submit" className="bg-black text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:opacity-80 transition-opacity">
                    Initialize Campaign Schema
                 </button>
              </div>
           </form>
        </main>
      )}

      {!isCreatingCampaign && (
        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto w-full">
          {/* Left Column: Authorize & Ballots */}
          <section className="lg:col-span-6 xl:col-span-5 flex flex-col">
            <h2 className="text-xs uppercase tracking-[0.3em] font-bold mb-6 flex items-center gap-2">
              <span className="w-8 h-[1px] bg-black"></span>
              Active Ballot Stations
            </h2>
            
            <div className="border border-black p-6 relative mb-8 bg-white">
               <h3 className="text-xl font-serif mb-6">Authorize New Terminal</h3>
                <form onSubmit={handleAuthorize} className="flex flex-col gap-4">
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full px-4 py-3 border border-black bg-[#F9F8F6] font-serif uppercase focus:outline-none focus:ring-1 focus:ring-black rounded-none appearance-none"
                  >
                     <option value="" disabled>Select Campaign...</option>
                     {campaigns.filter(c => !c.finished).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                  </select>

                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                      maxLength={6}
                      placeholder="E.g. A1B2C3"
                      className="flex-1 px-4 py-3 border border-black bg-[#F9F8F6] font-mono text-lg tracking-widest uppercase focus:outline-none focus:ring-1 focus:ring-black rounded-none"
                    />
                    <button
                      type="submit"
                      disabled={inputToken.trim().length !== 6 || !selectedCampaignId}
                      className="border border-black px-6 py-1 text-[10px] uppercase font-bold hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    >
                      Assign & Auth
                    </button>
                  </div>
                </form>
                {errorMsg && <p className="text-red-500 text-[10px] uppercase font-bold mt-3">{errorMsg}</p>}
            </div>

            <div className="border border-black p-6 relative mb-8 bg-white">
               <h3 className="text-xl font-serif mb-6">Manage Campaigns</h3>
               <div className="space-y-4">
                  {campaigns.map(c => (
                     <div key={c.id} className="flex flex-col border border-black p-4 bg-[#F9F8F6]">
                       <div className="flex justify-between items-center mb-2">
                         <div>
                           <p className="font-serif text-lg">{c.name}</p>
                           <p className="text-[9px] uppercase font-bold opacity-50">
                             {c.finished ? 'Voting Ended' : 'Active'} 
                             <span className="mx-2">•</span>
                             {c.finished ? (c.results?.totalVotes || 0) : blockchain.filter(b => b.data && b.data.campaignId === c.id).length} Votes Cast
                           </p>
                         </div>
                         <div className="flex gap-2">
                           {!c.finished && (
                             <FinishCampaignButton campaign={c} onFinish={async (id) => {
                                try {
                                  let token = await getAccessToken();
                                  if (!token) {
                                    const result = await googleSignIn();
                                    if (result) token = result.accessToken;
                                  }
                                  if (token) {
                                    socket.emit('finish_campaign', { campaignId: id, accessToken: token });
                                  }
                                } catch (err) {
                                  setErrorMsg("Failed to authenticate with Google");
                                  setTimeout(() => setErrorMsg(null), 3000);
                                }
                             }} />
                           )}
                           <button onClick={(e) => {
                             if(window.confirm('Are you sure you want to delete this campaign permanently?')) {
                               socket.emit('delete_campaign', c.id);
                             }
                           }} className="px-3 py-1 text-[10px] uppercase font-bold text-red-600 border border-red-600 hover:bg-red-600 hover:text-white transition-colors">Delete</button>
                         </div>
                       </div>
                       
                       {c.finished && c.results && (
                         <ResultsVisualizer results={c.results} />
                       )}
                     </div>
                  ))}
                  {campaigns.length === 0 && <p className="text-[10px] uppercase opacity-50">No campaigns created yet.</p>}
               </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {visibleBallots.map((ballot, idx) => (
                 <div key={ballot.id} className={`border border-black p-6 relative ${ballot.hasVoted ? 'bg-[#F9F8F6]' : 'bg-white'} ${(!ballot.authorized && ballot.locked) ? 'border-dashed opacity-70' : ''}`}>
                   <span className="absolute top-2 right-4 text-4xl font-serif opacity-10">{String(idx + 1).padStart(2, '0')}</span>
                   <p className="text-[9px] uppercase font-bold opacity-50 mb-1 font-mono">Token: {ballot.id}</p>
                   {ballot.category && <p className="text-xl uppercase font-bold text-black mb-4">{ballot.category}</p>}
                   <h3 className="text-lg font-serif mb-6 leading-tight">Terminal {ballot.id}</h3>
                   <div className="flex justify-between items-center mt-auto">
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase ${
                        ballot.ended ? 'bg-red-600 text-white' :
                        ballot.hasVoted ? 'bg-black text-white' :
                        ballot.authorized ? 'border border-black text-black' : 'bg-[#E5E5E5] text-black border border-black border-dashed'
                      }`}>
                         {ballot.ended ? 'Ended' : ballot.hasVoted ? 'Recorded' : (ballot.authorized ? 'In Progress' : 'Locked')}
                      </span>
                      <div className="flex gap-2">
                        {(ballot.hasVoted || (!ballot.authorized && ballot.locked)) && ballot.campaign && !ballot.campaign.finished && !ballot.ended && (
                           <button
                             onClick={() => unlockBallot(ballot.id)}
                             className="border border-black px-3 py-1 text-[8px] uppercase font-bold hover:bg-black hover:text-white transition-colors bg-white"
                           >
                             Release
                           </button>
                        )}
                        {!ballot.ended && (
                           <button
                             onClick={() => {
                               if (window.confirm('End voting on this specific terminal permanently?')) {
                                  socket.emit('end_ballot', ballot.id);
                               }
                             }}
                             className="border border-red-600 text-red-600 px-3 py-1 text-[8px] uppercase font-bold hover:bg-red-600 hover:text-white transition-colors bg-white"
                           >
                             End
                           </button>
                        )}
                      </div>
                   </div>
                 </div>
              ))}
              {visibleBallots.length === 0 && (
                 <div className="col-span-2 border border-black p-6 relative border-dashed opacity-40">
                    <span className="absolute top-2 right-4 text-4xl font-serif opacity-10">00</span>
                    <p className="text-[9px] uppercase font-bold mb-4">Pending</p>
                    <h3 className="text-xl font-serif mb-6">Awaiting Terminals</h3>
                    <div className="h-6 bg-[#E5E5E5] w-full"></div>
                 </div>
              )}
             </div>
          </section>
        </main>
      )}

      {/* Footer Bar */}
      <footer className="mt-12 flex flex-col md:flex-row justify-between items-center text-[9px] uppercase tracking-widest font-bold border-t border-black pt-4 opacity-60">
        <p>Active Terminals: {visibleBallots.length}</p>
        <p className="my-2 md:my-0">© 2024 VOTECHAIN PROTOCOL • ALL VOTES SECURE</p>
        <p></p>
      </footer>
    </div>
  );
}
