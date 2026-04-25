import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ElectionStatus } from '../types';
import { Plus, X, ListPlus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateHash, GENESIS_HASH } from '../blockchainUtils';
import { writeBatch, doc } from 'firebase/firestore';

export const AdminElectionCreator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [duration, setDuration] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const getEndTime = (dur: string) => {
    const now = new Date();
    if (dur === '1h') return new Date(now.getTime() + 3600000);
    if (dur === '24h') return new Date(now.getTime() + 86400000);
    if (dur === '7d') return new Date(now.getTime() + 604800000);
    return null;
  };

  const addOption = () => setOptions([...options, '']);
  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const seedDemo = async () => {
    setIsSeeding(true);
    try {
      const now = new Date();
      const electionData = {
        title: 'Network Protocol Upgrade 2.0',
        description: 'Global consensus on the deployment of V2 smart contract filters and enhanced zero-knowledge proof verification modules across all primary nodes.',
        status: ElectionStatus.ACTIVE,
        creatorId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        endTime: new Date(now.getTime() + 86400000), // 24h
        options: [
          { id: 'opt_0', label: 'Authorize Immediate Deployment' },
          { id: 'opt_1', label: 'Delay for Additional Audit' },
          { id: 'opt_2', label: 'Reject Phase 2 Proposal' }
        ],
        voteCounts: { opt_0: 2, opt_1: 1, opt_2: 0 }
      };

      const electionRef = await addDoc(collection(db, 'elections'), electionData);

      // Seed some votes
      const batch = writeBatch(db);
      const sampleVotes = [
        { userId: 'USR_ALPHA', optionId: 'opt_0', hash: 'HASH_A', prev: GENESIS_HASH, idx: 0 },
        { userId: 'USR_BETA', optionId: 'opt_0', hash: 'HASH_B', prev: 'HASH_A', idx: 1 },
        { userId: 'USR_GAMMA', optionId: 'opt_1', hash: 'HASH_C', prev: 'HASH_B', idx: 2 }
      ];

      sampleVotes.forEach(sv => {
        const voteId = `${sv.userId}_vote`;
        const vRef = doc(db, 'elections', electionRef.id, 'votes', voteId);
        batch.set(vRef, {
          electionId: electionRef.id,
          userId: sv.userId,
          optionId: sv.optionId,
          timestamp: serverTimestamp(),
          previousHash: sv.prev,
          hash: calculateHash({ ...sv, timestamp: new Date() }),
          blockIndex: sv.idx
        });
        const voterRef = doc(db, 'elections', electionRef.id, 'voters', sv.userId);
        batch.set(voterRef, { voted: true, timestamp: serverTimestamp() });
      });

      await batch.commit();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSeeding(false);
    }
  };

  const createElection = async () => {
    if (!title || options.some(o => !o)) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'elections'), {
        title,
        description,
        status: ElectionStatus.UPCOMING,
        creatorId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        endTime: getEndTime(duration),
        options: options.map((label, index) => ({ id: `opt_${index}`, label })),
        voteCounts: options.reduce((acc, _, index) => ({ ...acc, [`opt_${index}`]: 0 }), {})
      });
      setIsOpen(false);
      setTitle('');
      setDescription('');
      setOptions(['', '']);
      setDuration('24h');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 border border-emerald-500/40 text-emerald-500 px-8 py-3 font-serif italic text-xl hover:bg-emerald-500/10 transition-all shadow-md"
      >
        <Plus size={20} />
        <span>Deploy New Proposal</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-[#0f0f12] border border-zinc-800/80 w-full max-w-xl shadow-2xl relative"
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500"></div>
              
              <div className="p-8 border-b border-zinc-900 flex justify-between items-center bg-black/20">
                <h2 className="text-2xl font-serif italic text-white flex items-center gap-3">
                  <ListPlus className="text-emerald-500" />
                  Initialize Proposal Node
                </h2>
                <button onClick={() => setIsOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Proposal Identifier</label>
                  <input 
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-[#16161a] border border-zinc-800 px-4 py-4 focus:outline-none focus:border-emerald-500 text-white font-serif italic text-xl transition-all"
                    placeholder="e.g., Strategic Treasury Allocation"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Executive Summary</label>
                  <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-[#16161a] border border-zinc-800 px-4 py-4 focus:outline-none focus:border-emerald-500 text-zinc-300 leading-relaxed font-light transition-all"
                    rows={4}
                    placeholder="Authorize the transition of assets..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Temporal Window</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '1h', label: '1 Hour' },
                      { id: '24h', label: '24 Hours' },
                      { id: '7d', label: '7 Days' }
                    ].map((dur) => (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setDuration(dur.id)}
                        className={`py-3 border text-[10px] uppercase font-bold tracking-widest transition-all ${
                          duration === dur.id 
                            ? 'bg-emerald-500 text-black border-emerald-500' 
                            : 'bg-black/40 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800/60">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-4">Resolution Options</label>
                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-1 relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-700">{String(index + 1).padStart(2, '0')}</span>
                          <input 
                            type="text" 
                            value={option}
                            onChange={e => {
                              const newOptions = [...options];
                              newOptions[index] = e.target.value;
                              setOptions(newOptions);
                            }}
                            className="w-full bg-[#16161a] border border-zinc-800 pl-12 pr-4 py-3 focus:outline-none focus:border-emerald-500 text-white transition-all shadow-inner"
                            placeholder={`Define resolution ${index + 1}`}
                          />
                        </div>
                        {options.length > 2 && (
                          <button onClick={() => removeOption(index)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                            <X size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={addOption}
                    className="text-emerald-500 font-serif italic text-lg hover:underline flex items-center gap-2 mt-2"
                  >
                    <Plus size={18} />
                    Add Alternative
                  </button>
                </div>
              </div>

              <div className="p-8 bg-black/20 border-t border-zinc-900 flex justify-between gap-6 items-center">
                <button
                  type="button"
                  onClick={seedDemo}
                  disabled={isSeeding}
                  className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-emerald-500/60 hover:text-emerald-500 transition-colors disabled:opacity-30"
                >
                  <Sparkles size={14} />
                  {isSeeding ? 'Seeding...' : 'Seed Protocol'}
                </button>
                <div className="flex gap-6 items-center">
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300"
                  >
                    Terminate
                  </button>
                  <button 
                    onClick={createElection}
                    disabled={loading || !title || options.some(o => !o)}
                    className="px-8 py-3 bg-emerald-500 text-black font-serif italic text-xl hover:bg-emerald-400 transition-all disabled:opacity-30 flex items-center gap-3"
                  >
                    {loading ? 'Propagating...' : 'Launch Protocol'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
