import React from 'react';
import { Election, ElectionStatus } from '../types';
import { Calendar, Users, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface ElectionCardProps {
  election: Election;
  onClick: (id: string) => void;
}

export const ElectionCard: React.FC<ElectionCardProps> = ({ election, onClick }) => {
  const isUpcoming = election.status === ElectionStatus.UPCOMING;
  const isActive = election.status === ElectionStatus.ACTIVE;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-[#0f0f12] border border-zinc-800/60 p-8 cursor-pointer group transition-all relative overflow-hidden"
      onClick={() => onClick(election.id)}
    >
      <div className="absolute top-0 right-0 p-4">
        <div className={`px-3 py-1 border text-[9px] font-bold uppercase tracking-widest ${
          isActive ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 
          isUpcoming ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 
          'bg-zinc-800/50 border-zinc-700 text-zinc-500'
        }`}>
          {election.status}
        </div>
      </div>

      <p className="text-[10px] text-zinc-500 uppercase tracking-[0.25em] mb-4 font-bold">Node Proposal</p>
      <h3 className="text-3xl font-serif italic text-white mb-4 group-hover:text-emerald-400 transition-colors leading-tight">{election.title}</h3>
      <p className="text-zinc-500 text-sm mb-6 line-clamp-2 leading-relaxed">{election.description}</p>

      {election.voteCounts && (
        <div className="space-y-2 mb-8">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">Real-time Tabulation</p>
          <div className="grid grid-cols-1 gap-2">
            {election.options.slice(0, 3).map(option => (
              <div key={option.id} className="flex justify-between items-center bg-black/20 px-3 py-2 border border-zinc-800/40">
                <span className="text-[10px] text-zinc-400 font-serif italic truncate mr-4">{option.label}</span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold">{(election.voteCounts?.[option.id] || 0)}</span>
              </div>
            ))}
            {election.options.length > 3 && (
              <p className="text-[9px] text-zinc-700 italic font-mono">+ {election.options.length - 3} more options...</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 mt-auto">
        {isActive && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick(election.id);
            }}
            className="w-full py-4 bg-emerald-500 text-black text-center font-serif italic text-lg hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 group/vote mb-2 uppercase tracking-tighter font-bold"
          >
            Cast Consensus Vote
            <ChevronRight size={18} className="group-hover/vote:translate-x-1 transition-transform" />
          </button>
        )}
        
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800/60">
          <div className="flex items-center gap-3 text-zinc-600">
            <span className="text-[10px] font-mono tracking-widest font-bold">ID: {election.id.substring(0, 8).toUpperCase()}</span>
          </div>
          <div className="text-zinc-600 group-hover:text-emerald-500 transition-colors">
            <ChevronRight size={20} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
