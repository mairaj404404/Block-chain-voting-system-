import React from 'react';
import { auth } from '../firebase';
import { LogIn, LogOut, CheckSquare } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  isAdmin: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, isAdmin }) => {
  const login = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-[#080808] text-zinc-300 font-sans flex flex-col">
      <nav className="h-20 border-b border-zinc-800/60 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-50 bg-[#080808]/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-emerald-500 rounded-sm rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <div className="w-5 h-5 border-2 border-black rotate-[-45deg] flex items-center justify-center">
              <CheckSquare size={14} className="text-black" />
            </div>
          </div>
          <h1 className="font-serif text-xl tracking-widest text-white uppercase sm:block hidden">
            Veritas <span className="text-emerald-500 font-sans text-[10px] tracking-normal ml-2 opacity-80 uppercase">Node v2.4</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold">Authenticated Identity</p>
                <p className="text-xs font-mono text-white opacity-80">{user.email?.substring(0, 10)}...</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-emerald-500/30 p-1">
                  <img src={user.photoURL || ''} alt="" className="w-full h-full rounded-full bg-[#111] object-cover" />
                </div>
                <button 
                  onClick={logout}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                  title="Disconnect Node"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={login}
              className="flex items-center gap-2 border border-emerald-500/40 text-white px-5 py-2 font-serif italic text-lg hover:bg-emerald-500/10 transition-all shadow-sm"
            >
              <LogIn size={18} className="text-emerald-500" />
              <span>Connect Node</span>
            </motion.button>
          )}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-10">
        {children}
      </main>

      <footer className="h-10 bg-[#0a0a0c] border-t border-zinc-800/60 px-4 sm:px-8 flex items-center justify-between text-[9px] text-zinc-600 font-mono tracking-tighter uppercase">
        <div className="flex gap-4">
          <span>GAS_PRICE: 14 GWEI</span>
          <span className="hidden sm:inline">// NETWORK: MAINNET</span>
          <span className="hidden md:inline">// STATUS: FULLY_SYNCED</span>
        </div>
        <div>/ VERITAS ON-CHAIN GOVERNANCE / SECURE_NODE_01</div>
      </footer>
    </div>
  );
};
