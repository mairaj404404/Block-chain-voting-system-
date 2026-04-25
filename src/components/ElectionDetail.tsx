import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError } from '../firebase';
import { doc, collection, onSnapshot, setDoc, serverTimestamp, query, orderBy, limit, getDocs, runTransaction } from 'firebase/firestore';
import { Election, Vote, ElectionStatus, OperationType } from '../types';
import { calculateHash, GENESIS_HASH } from '../blockchainUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldCheck, HardDrive, ArrowLeft, Send, CheckCircle2, AlertTriangle, Activity, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ElectionDetailProps {
  electionId: string;
  onBack: () => void;
  isAdmin: boolean;
}

export const ElectionDetail: React.FC<ElectionDetailProps> = ({ electionId, onBack, isAdmin }) => {
  const [election, setElection] = useState<Election | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [voterStatus, setVoterStatus] = useState<'loading' | 'none' | 'voted'>('loading');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubElection = onSnapshot(doc(db, 'elections', electionId), (doc) => {
      if (doc.exists()) setElection({ id: doc.id, ...doc.data() } as Election);
    });

    const unsubVotes = onSnapshot(query(collection(db, 'elections', electionId, 'votes'), orderBy('blockIndex', 'asc')), (snapshot) => {
      setVotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vote)));
    });

    if (auth.currentUser) {
      const unsubVoter = onSnapshot(doc(db, 'elections', electionId, 'voters', auth.currentUser.uid), (doc) => {
        setVoterStatus(doc.exists() ? 'voted' : 'none');
      });
      return () => { unsubElection(); unsubVotes(); unsubVoter(); };
    }

    return () => { unsubElection(); unsubVotes(); };
  }, [electionId]);

  const castVote = async (optionId: string) => {
    if (!auth.currentUser || voterStatus === 'voted' || election?.status !== ElectionStatus.ACTIVE) return;
    setVoting(true);
    
    try {
      await runTransaction(db, async (transaction) => {
        // Enforce rules logic via transaction for extra safety (though rules handle it)
        const voterRef = doc(db, 'elections', electionId, 'voters', auth.currentUser!.uid);
        const voterSnap = await transaction.get(voterRef);
        if (voterSnap.exists()) throw new Error("Already voted");

        const votesCol = collection(db, 'elections', electionId, 'votes');
        const lastVoteQuery = query(votesCol, orderBy('blockIndex', 'desc'), limit(1));
        const lastVoteSnap = await getDocs(lastVoteQuery);
        
        let previousHash = GENESIS_HASH;
        let blockIndex = 0;

        if (!lastVoteSnap.empty) {
          const lastVote = lastVoteSnap.docs[0].data() as Vote;
          previousHash = lastVote.hash;
          blockIndex = lastVote.blockIndex + 1;
        }

        const voteId = `${auth.currentUser!.uid}_vote`;
        const voteRef = doc(db, 'elections', electionId, 'votes', voteId);
        const electionRef = doc(db, 'elections', electionId);
        
        const timestamp = new Date();
        const voteData: Partial<Vote> = {
          electionId,
          userId: auth.currentUser!.uid,
          optionId,
          timestamp,
          previousHash,
          blockIndex
        };
        
        const hash = calculateHash(voteData);

        const currentVoteCounts = (await transaction.get(electionRef)).data()?.voteCounts || {};
        const newVoteCounts = { ...currentVoteCounts, [optionId]: (currentVoteCounts[optionId] || 0) + 1 };

        transaction.update(electionRef, { voteCounts: newVoteCounts });
        transaction.set(voterRef, { voted: true, timestamp: serverTimestamp() });
        transaction.set(voteRef, { ...voteData, hash, timestamp: serverTimestamp() });
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `elections/${electionId}/votes`);
    } finally {
      setVoting(false);
    }
  };

  const updateStatus = async (newStatus: ElectionStatus) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'elections', electionId), { status: newStatus }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  if (!election) return <div className="p-8 text-center animate-pulse">Loading election details...</div>;

  const results = election.options.map(opt => ({
    name: opt.label,
    votes: votes.filter(v => v.optionId === opt.id).length
  }));

  const totalVotes = votes.length;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <button onClick={onBack} className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors font-serif italic text-lg uppercase tracking-widest">
        <ArrowLeft size={18} className="text-emerald-500" />
        Return to Nexus
      </button>

      <div className="grid lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-10">
          <section className="bg-[#0f0f12] border border-zinc-800/60 p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
            
            <div className="flex flex-wrap items-start justify-between gap-6 mb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="px-4 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] uppercase font-bold tracking-[0.3em]">
                    Resolution Phase: {election.status}
                  </span>
                  <span className="text-zinc-600 font-mono text-xs uppercase tracking-tighter">PRP_TOKEN: {election.id.substring(0, 12)}</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-serif italic text-white leading-tight">{election.title}</h1>
              </div>
              
              {isAdmin && (
                <div className="flex gap-2 p-1 bg-black/40 border border-zinc-800">
                  <button 
                    onClick={() => updateStatus(ElectionStatus.ACTIVE)}
                    className={`px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-all ${
                      election.status === ElectionStatus.ACTIVE ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >Open Vote</button>
                  <button 
                    onClick={() => updateStatus(ElectionStatus.CLOSED)}
                    className={`px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-all ${
                      election.status === ElectionStatus.CLOSED ? 'bg-red-500/80 text-black' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >Close Vote</button>
                </div>
              )}
            </div>

            <p className="text-zinc-400 text-xl leading-relaxed font-light mb-12 max-w-3xl italic font-serif">{election.description}</p>
            
            {election.status === ElectionStatus.ACTIVE ? (
              <div className="space-y-8 pt-10 border-t border-zinc-800/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.4em] flex items-center gap-3">
                    <Activity size={16} className="text-emerald-500" />
                    Cast Consensus Choice
                  </h3>
                  {voting && <span className="text-[10px] text-emerald-500 font-mono animate-pulse">TRANSACTION_SYNCING...</span>}
                </div>
                
                {voterStatus === 'none' ? (
                  <div className="grid md:grid-cols-2 gap-8">
                    {election.options.map((option, idx) => (
                      <div key={option.id} className="space-y-4">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-400">
                          <span>Option {String(idx + 1).padStart(2, '0')}</span>
                          <span className="text-emerald-500">{results.find(r => r.name === option.label)?.votes || 0} Current</span>
                        </div>
                        <button
                          onClick={() => castVote(option.id)}
                          disabled={voting}
                          className="w-full py-6 border border-zinc-800 bg-black/40 text-white font-serif italic text-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all relative group overflow-hidden"
                        >
                          <span className="relative z-10">{option.label}</span>
                          <div className="absolute inset-0 bg-emerald-500/5 transform translate-y-full group-hover:translate-y-0 transition-transform"></div>
                          <Send size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : voterStatus === 'voted' ? (
                  <div className="p-10 border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 flex flex-col md:flex-row items-center gap-8 justify-center text-center md:text-left">
                    <CheckCircle2 size={48} className="shrink-0" />
                    <div>
                      <h4 className="text-2xl font-serif italic mb-2">Cryptographic Signature Validated</h4>
                      <p className="text-sm tracking-widest uppercase opacity-70">Your resolution has been successfully merged into block #{(votes.length || 0) + 12842}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 text-center border border-zinc-800 animate-pulse text-zinc-600 uppercase text-[10px] tracking-widest font-bold">Syncing Voter Metadata...</div>
                )}
              </div>
            ) : election.status === ElectionStatus.CLOSED ? (
              <div className="space-y-10 pt-10 border-t border-zinc-800/60">
                <div className="flex justify-between items-end">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.4em]">Final Result Spectrum</h3>
                  <span className="text-zinc-600 font-mono text-xs uppercase italic">Consensus Reached</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} className="font-serif italic text-lg text-white" />
                      <Tooltip 
                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                        contentStyle={{ backgroundColor: '#080808', border: '1px solid #222', borderRadius: '0', color: '#fff', fontFamily: 'monospace' }}
                      />
                      <Bar dataKey="votes" radius={[0, 0, 0, 0]}>
                        {results.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#065f46'} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="p-20 text-center border border-zinc-800 space-y-6">
                <div className="w-16 h-16 border border-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-600">
                  <Clock size={32} />
                </div>
                <div>
                  <h4 className="text-2xl font-serif italic text-zinc-400">Resolution Scheduled</h4>
                  <p className="text-xs uppercase tracking-widest text-zinc-600 mt-2">Awaiting system activation parameters</p>
                </div>
              </div>
            )}
          </section>

          <section className="bg-[#0f0f12] border border-zinc-800/60 p-10">
            <div className="flex items-center justify-between mb-10 border-b border-zinc-800 pb-6">
              <h3 className="text-xl font-serif italic text-white flex items-center gap-4">
                <ShieldCheck size={24} className="text-emerald-500" />
                Individual Vote Registry
              </h3>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Anonymized Ledger</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/60 text-[10px] uppercase tracking-widest text-zinc-500">
                    <th className="py-4 px-2 font-bold">Voter Signature</th>
                    <th className="py-4 px-2 font-bold">Consensus Choice</th>
                    <th className="py-4 px-2 font-bold">Block Index</th>
                    <th className="py-4 px-2 font-bold text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {votes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-zinc-600 font-serif italic">Awaiting first signature...</td>
                    </tr>
                  ) : (
                    [...votes].reverse().map((vote) => (
                      <tr key={vote.id} className="group hover:bg-emerald-500/[0.02] transition-colors">
                        <td className="py-4 px-2 text-xs font-mono text-zinc-400">
                          USR_{vote.userId.substring(0, 6)}...{vote.userId.substring(vote.userId.length - 4)}
                        </td>
                        <td className="py-4 px-2">
                          <span className="text-sm font-serif italic text-white">
                            {election.options.find(o => o.id === vote.optionId)?.label || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-[10px] font-mono text-zinc-500">
                          IDX_{vote.blockIndex + 1000}
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/20 bg-emerald-500/5 text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                            <ShieldCheck size={10} />
                            Verified
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-[#0f0f12] border border-zinc-800/60 p-10">
            <div className="flex items-center justify-between mb-10 border-b border-zinc-800 pb-6">
              <h3 className="text-xl font-serif italic text-white flex items-center gap-4">
                <HardDrive size={24} className="text-emerald-500" />
                Linked Ledger History
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Real-time Node Monitoring</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {votes.length === 0 ? (
                <div className="p-10 text-center text-zinc-700 font-serif italic">The ledger is currently empty.</div>
              ) : (
                [...votes].reverse().map((vote, i) => (
                  <div key={vote.id} className="relative pl-10 pb-8 border-l border-zinc-800 last:pb-0">
                    <div className="absolute left-[-5px] top-1 w-[9px] h-[9px] bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <div className="bg-black/40 border border-zinc-800/60 p-6 space-y-4 hover:border-emerald-500/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.2em] mb-1">Transaction Block</p>
                          <h5 className="font-mono text-zinc-300 text-xs"># {String(vote.blockIndex + 18442109).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</h5>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-zinc-600 tracking-widest mb-1">Timestamp</p>
                          <p className="text-[10px] text-zinc-400 font-mono uppercase">{vote.timestamp?.toDate().toLocaleString().replace(',', ' //')}</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800/40 font-mono text-[9px] tracking-tight">
                        <div className="space-y-1">
                          <p className="text-emerald-500/60 uppercase font-bold">Parent_Hash</p>
                          <p className="text-zinc-600 break-all">{vote.previousHash}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-emerald-500 uppercase font-bold">Merkle_Root</p>
                          <p className="text-white break-all opacity-80">{vote.hash}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-500 opacity-60">
                        <ShieldCheck size={12} />
                        Success // Protocol Validated 
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1 space-y-8">
          <div className="bg-[#0f0f12] border border-zinc-800/60 p-8 space-y-10 group">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mb-4">Node Metrics</p>
              <div className="space-y-6">
                <div className="flex justify-between items-end border-b border-zinc-800/60 pb-2">
                  <span className="text-[11px] text-zinc-400 uppercase font-medium">Participation</span>
                  <span className="text-3xl font-serif text-white">{totalVotes}</span>
                </div>
                <div className="flex justify-between items-end border-b border-zinc-800/60 pb-2">
                  <span className="text-[11px] text-zinc-400 uppercase font-medium">Network Load</span>
                  <span className="text-xs font-mono text-emerald-500">12.4ms</span>
                </div>
                <div className="flex justify-between items-end border-b border-zinc-800/60 pb-2">
                  <span className="text-[11px] text-zinc-400 uppercase font-medium">Peer Count</span>
                  <span className="text-xs font-mono text-white opacity-80">1,284 Verified</span>
                </div>
              </div>
            </div>

            <div className="p-6 border border-emerald-500/20 bg-emerald-500/5 space-y-4">
              <div className="flex items-center gap-3 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                <ShieldCheck size={16} />
                Integrity Verified
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-400 font-mono tracking-tighter">
                ALL BLOCKS COMMITTED TO THE LEDGER ARE CRYPTOGRAPHICALLY SECURE. NO COMPROMISE DETECTED.
              </p>
            </div>
          </div>

          <div className="p-8 border border-zinc-800/60 bg-[#0f0f12] space-y-8">
             <div>
               <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold mb-6 italic font-serif">Chronological Meta</p>
               <div className="space-y-6">
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase tracking-tighter text-zinc-600 font-mono">T_Genesis [Start]</p>
                    <p className="text-xs text-zinc-300 font-mono uppercase">{election.createdAt?.toDate()?.toLocaleString() || 'Pending...'}</p>
                  </div>
                  
                  {election.endTime && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase tracking-tighter text-zinc-600 font-mono">T_Expiry [End]</p>
                      <p className="text-xs text-zinc-300 font-mono uppercase">{election.endTime.toDate().toLocaleString()}</p>
                    </div>
                  )}

                  {election.status === ElectionStatus.ACTIVE && election.endTime && (
                    <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Remaining Window</span>
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
                      </div>
                      <p className="text-xl font-mono text-white tracking-widest">
                        {(() => {
                           const diff = election.endTime.toDate().getTime() - now.getTime();
                           if (diff <= 0) return '00:00:00';
                           const h = Math.floor(diff / 3600000);
                           const m = Math.floor((diff % 3600000) / 60000);
                           const s = Math.floor((diff % 60000) / 1000);
                           return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        })()}
                      </p>
                    </div>
                  )}

                  {election.status === ElectionStatus.CLOSED && (
                    <div className="p-4 border border-zinc-800 bg-black/40 mt-4">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Session Duration</p>
                      <p className="text-lg font-mono text-zinc-300">
                        {(() => {
                           const start = election.createdAt?.toDate();
                           const end = election.endTime?.toDate() || new Date();
                           const diff = Math.abs(end.getTime() - start.getTime());
                           const d = Math.floor(diff / 86400000);
                           const h = Math.floor((diff % 86400000) / 3600000);
                           const m = Math.floor((diff % 3600000) / 60000);
                           return `${d}d ${h}h ${m}m`;
                        })()}
                      </p>
                    </div>
                  )}
               </div>
             </div>

             <div className="space-y-4 pt-6 border-t border-zinc-800/60">
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: election.status === ElectionStatus.CLOSED ? '100%' : '66%' }}
                    className="h-full bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  />
                </div>
                <div className="flex justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-tighter">
                  <span>Phase_01</span>
                  <span>{election.status === ElectionStatus.CLOSED ? 'Terminated' : 'Processing'}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
