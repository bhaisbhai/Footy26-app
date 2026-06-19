import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Trophy, AlertCircle, Bell, Swords, ListOrdered, Newspaper, Network, Sparkles } from 'lucide-react';
import { Match } from './types';
import { MatchCard } from './components/MatchCard';
import { Standings } from './components/Standings';
import { StatsViewer } from './components/StatsViewer';
import { NewsViewer } from './components/NewsViewer';
import { KnockoutViewer } from './components/KnockoutViewer';
import { FantasyAssistant } from './components/FantasyAssistant';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATCHES' | 'STANDINGS' | 'BRACKET' | 'LEADERS' | 'NEWS' | 'FANTASY'>('MATCHES');
  
  const [subscribedMatches, setSubscribedMatches] = useState<Set<string>>(new Set());
  const prevMatchesRef = useRef<Match[]>([]);

  useEffect(() => {
    // Check for score/status changes in subscribed matches and trigger notifications
    if (prevMatchesRef.current.length > 0 && subscribedMatches.size > 0 && Notification.permission === 'granted') {
      matches.forEach(match => {
        if (!subscribedMatches.has(match.id)) return;
        
        const prevMatch = prevMatchesRef.current.find(m => m.id === match.id);
        if (prevMatch) {
          const scoreChanged = prevMatch.homeScore !== match.homeScore || prevMatch.awayScore !== match.awayScore;
          const statusChanged = prevMatch.status !== match.status;

          if (scoreChanged) {
            new Notification('Goal! ⚽', {
              body: `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`,
              icon: '/icon.png', // Optional, will fall back if missing
            });
          } else if (statusChanged && match.status === 'FINISHED') {
            new Notification('Full Time 🏁', {
              body: `${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`,
            });
            // Optionally remove from subscriptions after match finishes
            setSubscribedMatches(prev => {
              const newSet = new Set(prev);
              newSet.delete(match.id);
              return newSet;
            });
          }
        }
      });
    }

    prevMatchesRef.current = matches;
  }, [matches, subscribedMatches]);

  useEffect(() => {
    const eventSource = new EventSource('/api/matches/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'MATCH_UPDATE') {
          setMatches(data.matches || []);
          setLoading(false);
          setIsRefreshing(false);
          setError(null);
        } else if (data.type === 'FETCH_STATE') {
          if (data.loading) {
            setMatches(prev => {
              if (prev.length === 0) {
                setLoading(true);
              } else {
                setIsRefreshing(true);
              }
              return prev;
            });
          } else {
            setIsRefreshing(false);
            setLoading(false);
          }
        } else if (data.type === 'ERROR') {
          setError(data.error);
          setLoading(false);
          setIsRefreshing(false);
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      console.log('SSE connection lost, browser is reconnecting...');
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/matches/refresh', { method: 'POST' });
    } catch (err) {
      console.error('Failed to manually refresh', err);
      setIsRefreshing(false);
    }
  };

  const liveMatches = matches.filter(m => m.status === 'LIVE');
  const upcomingMatches = matches.filter(m => m.status === 'UPCOMING')
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const finishedMatches = matches.filter(m => m.status === 'FINISHED')
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const handleToggleSubscription = async (id: string) => {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('We need notification permissions to send you live updates.');
        return;
      }
    } else if (Notification.permission === 'denied') {
      alert('Notification permissions are denied. Please enable them in your browser settings.');
      return;
    }

    setSubscribedMatches(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-white/20 relative overflow-hidden">
      {/* Background Mesh Gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
            >
              <span className="font-black italic text-2xl">W</span>
            </motion.div>
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-4"
              >
                Match Center
                {liveMatches.length > 0 && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-white uppercase tracking-widest align-middle">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    {liveMatches.length} Live
                  </span>
                )}
              </motion.h1>
            </div>
          </div>
          
          <motion.button
            onClick={() => handleManualRefresh()}
            disabled={isRefreshing || loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl border border-white/10 transition-colors disabled:opacity-50 font-medium text-sm backdrop-blur-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Live Sync'}
          </motion.button>
        </header>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-200 rounded-2xl flex items-start gap-3"
          >
             <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
             <p className="text-sm font-medium leading-relaxed">
                Could not fetch latest match data. This may be due to an API limit or missing credentials. Please make sure GEMINI_API_KEY is configured.
             </p>
          </motion.div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-12 bg-white/5 p-1.5 rounded-[1rem] w-fit border border-white/10 backdrop-blur-md shadow-2xl overflow-x-auto max-w-full custom-scrollbar">
          <button 
             onClick={() => setActiveTab('MATCHES')} 
             className={`px-6 py-3 rounded-xl text-xs font-bold tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${activeTab === 'MATCHES' ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
             <Swords className={`w-4 h-4 ${activeTab === 'MATCHES' ? 'text-yellow-400' : ''}`} />
             MATCHES
          </button>
          <button 
             onClick={() => setActiveTab('STANDINGS')} 
             className={`px-6 py-3 rounded-xl text-xs font-bold tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${activeTab === 'STANDINGS' ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
             <ListOrdered className={`w-4 h-4 ${activeTab === 'STANDINGS' ? 'text-blue-400' : ''}`} />
             STANDINGS
          </button>
          <button 
             onClick={() => setActiveTab('BRACKET')} 
             className={`px-6 py-3 rounded-xl text-xs font-bold tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${activeTab === 'BRACKET' ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
             <Network className={`w-4 h-4 ${activeTab === 'BRACKET' ? 'text-purple-400' : ''}`} />
             KNOCKOUTS
          </button>
          <button 
             onClick={() => setActiveTab('LEADERS')} 
             className={`px-6 py-3 rounded-xl text-xs font-bold tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${activeTab === 'LEADERS' ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
             <Trophy className={`w-4 h-4 ${activeTab === 'LEADERS' ? 'text-emerald-400' : ''}`} />
             LEADERS
          </button>
          <button 
             onClick={() => setActiveTab('NEWS')} 
             className={`px-6 py-3 rounded-xl text-xs font-bold tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${activeTab === 'NEWS' ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
             <Newspaper className={`w-4 h-4 ${activeTab === 'NEWS' ? 'text-orange-400' : ''}`} />
             NEWS
          </button>
          <button 
             onClick={() => setActiveTab('FANTASY')} 
             className={`px-6 py-3 rounded-xl text-xs font-bold tracking-widest transition-all whitespace-nowrap flex items-center gap-3 ${activeTab === 'FANTASY' ? 'bg-white/15 text-white shadow-md' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
          >
             <Sparkles className={`w-4 h-4 ${activeTab === 'FANTASY' ? 'text-pink-400' : ''}`} />
             FANTASY 
          </button>
        </div>

        {/* Content Section */}
        {activeTab === 'MATCHES' && (
          matches.length === 0 && loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-44 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
              }}
              className="space-y-16"
            >
             {/* Upcoming Matches */}
             {upcomingMatches.length > 0 && (
               <section>
                 <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase mb-6 flex items-center gap-2 px-2">
                   <div className="w-2 h-2 rounded-full bg-white/20" />
                   Upcoming
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <AnimatePresence>
                     {upcomingMatches.map(match => (
                       <MatchCard 
                         key={match.id} 
                         match={match} 
                         isSubscribed={subscribedMatches.has(match.id)}
                         onToggleSubscription={handleToggleSubscription}
                       />
                     ))}
                   </AnimatePresence>
                 </div>
               </section>
             )}

             {/* Live Matches */}
             {liveMatches.length > 0 && (
               <section>
                 <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase mb-6 flex items-center gap-2 px-2">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                   Happening Now
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <AnimatePresence>
                     {liveMatches.map((match, index) => (
                       <MatchCard 
                         key={match.id} 
                         match={match} 
                         isSubscribed={subscribedMatches.has(match.id)}
                         onToggleSubscription={handleToggleSubscription}
                         defaultExpanded={index === 0}
                       />
                     ))}
                   </AnimatePresence>
                 </div>
               </section>
             )}

             {/* Finished Matches */}
             {finishedMatches.length > 0 && (
               <section>
                 <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase mb-6 flex items-center gap-2 px-2">
                   <div className="w-2 h-2 rounded-full bg-white/40" />
                   Recent Results
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <AnimatePresence>
                     {finishedMatches.map((match, index) => (
                       <MatchCard 
                         key={match.id} 
                         match={match} 
                         isSubscribed={subscribedMatches.has(match.id)}
                         onToggleSubscription={handleToggleSubscription}
                         defaultExpanded={liveMatches.length === 0 && index === 0}
                       />
                     ))}
                   </AnimatePresence>
                 </div>
               </section>
             )}

             {!loading && matches.length === 0 && !error && (
               <div className="py-24 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/5 backdrop-blur-xl">
                  <p className="text-white/40 font-medium tracking-wide">No matches scheduled for today.</p>
               </div>
             )}
          </motion.div>
          )
        )}

        {/* Standings Section */}
        {activeTab === 'STANDINGS' && (
           <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
           >
              <Standings />
           </motion.div>
        )}

        {/* Bracket Section */}
        {activeTab === 'BRACKET' && (
           <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
           >
              <KnockoutViewer />
           </motion.div>
        )}

        {/* Leaders Section */}
        {activeTab === 'LEADERS' && (
           <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
           >
              <StatsViewer />
           </motion.div>
        )}

        {/* News Section */}
        {activeTab === 'NEWS' && (
           <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
           >
              <NewsViewer />
           </motion.div>
        )}

        {/* Fantasy Section */}
        {activeTab === 'FANTASY' && (
           <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-16"
           >
              <FantasyAssistant />
           </motion.div>
        )}

        {/* Bottom Micro-Bar */}
        <footer className="mt-20 h-12 flex flex-col md:flex-row items-center justify-between text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium gap-4">
          <div>Qatar 2022™ / FIFA official Data Feed</div>
          <div className="flex gap-8">
            <span className="hidden md:inline">Global Audience: 1.2B</span>
            <span>Weather: 24°C Clear</span>
            <span>UTC +3:00</span>
          </div>
        </footer>

      </div>
    </div>
  );
}