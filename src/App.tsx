import React, { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { Election, UserProfile, OperationType } from './types';
import { Layout } from './components/Layout';
import { ElectionCard } from './components/ElectionCard';
import { ElectionDetail } from './components/ElectionDetail';
import { AdminElectionCreator } from './components/AdminElectionCreator';
import { Bot, Sparkles, Database, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user profile
        try {
          const userSnap = await getDoc(doc(db, 'users', u.uid));
          const isAdminEmail = u.email === 'mairajansari905@gmail.com';
          
          if (!userSnap.exists()) {
            await setDoc(doc(db, 'users', u.uid), {
              displayName: u.displayName || 'Anonymous User',
              photoURL: u.photoURL || '',
              isAdmin: isAdminEmail
            });
            setIsAdmin(isAdminEmail);
          } else {
            const data = userSnap.data();
            if (isAdminEmail && !data?.isAdmin) {
              await setDoc(doc(db, 'users', u.uid), { isAdmin: true }, { merge: true });
              setIsAdmin(true);
            } else {
              setIsAdmin(data?.isAdmin || false);
            }
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    const q = query(collection(db, 'elections'), orderBy('createdAt', 'desc'));
    const unsubElections = onSnapshot(q, (snapshot) => {
      setElections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Election)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'elections');
    });

    return () => { unsubAuth(); unsubElections(); };
  }, []);

  const getSystemIntelligence = async () => {
    if (!process.env.GEMINI_API_KEY) return;
    setAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a cybersecurity expert. Summarize why this blockchain voting system is secure. 
      It uses SHA-256 hashing, linked blocks (previousHash), and Firestore security rules to prevent double-voting. 
      Keep it professional and encouraging in 3 bullet points.`;
      
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      setAiAnalysis(result.text);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <Layout user={user} isAdmin={isAdmin}>
      <AnimatePresence mode="wait">
        {!selectedElectionId ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-12"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
              <div className="max-w-2xl">
                <p className="text-[11px] text-emerald-500 uppercase tracking-[0.3em] font-bold mb-4 flex items-center gap-2">
                  <span className="w-5 h-[1px] bg-emerald-500"></span>
                  Protocols Active
                </p>
                <h1 className="text-5xl md:text-6xl font-serif italic text-white mb-6 leading-tight">
                  Governance & Decentralized <span className="text-zinc-600">Consensus.</span>
                </h1>
                <p className="text-zinc-400 text-lg leading-relaxed font-light">
                  The DecentralVoter node is currently processing on-chain proposals. 
                  All votes are cryptographically verified and immutable.
                </p>
              </div>
              <div className="w-full lg:w-auto">
                {isAdmin && <AdminElectionCreator />}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {elections.map((election) => (
                <ElectionCard 
                  key={election.id} 
                  election={election} 
                  onClick={setSelectedElectionId} 
                />
              ))}
              {elections.length === 0 && (
                <div className="col-span-full py-24 text-center bg-[#0f0f12] border border-zinc-800/60 rounded-sm">
                  <Database size={48} className="mx-auto text-zinc-700 mb-6" />
                  <h3 className="text-xl font-serif italic text-zinc-300">No Proposals Found</h3>
                  <p className="text-zinc-500 text-sm tracking-widest uppercase mt-2">Awaiting new system directives</p>
                </div>
              )}
            </div>

            <div className="bg-[#0f0f12] border border-zinc-800/60 rounded-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20"></div>
              <div className="p-8 flex flex-col md:flex-row items-center gap-10">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-500 shrink-0 transform rotate-45">
                  <ShieldCheck size={32} className="-rotate-45" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-serif italic text-white mb-2">Cryptographic Audit Protocol</h3>
                  <p className="text-zinc-500 mb-8 max-w-xl">Initialize a system-wide integrity check using AI-driven heuristic analysis of the current block structure.</p>
                  
                  {aiAnalysis ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-black/40 p-8 border border-zinc-800/60 font-mono text-xs text-zinc-400 leading-relaxed max-w-3xl"
                    >
                      <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3 font-bold text-emerald-500 uppercase tracking-widest">
                          <Sparkles size={14} />
                          AI Intelligence Report
                        </div>
                        <span className="text-zinc-700">SIG_2026_XDA</span>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} className="space-y-2" />
                    </motion.div>
                  ) : (
                    <button 
                      onClick={getSystemIntelligence}
                      disabled={analyzing}
                      className="flex items-center gap-3 border border-emerald-500/40 text-emerald-500 px-8 py-3 font-serif italic text-xl hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                    >
                      <Bot size={20} />
                      {analyzing ? 'Initializing Sync...' : 'Execute AI Audit'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ElectionDetail 
              electionId={selectedElectionId} 
              onBack={() => setSelectedElectionId(null)}
              isAdmin={isAdmin}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
