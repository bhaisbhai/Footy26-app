import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Network } from 'lucide-react';
import { Match } from '../types';

const ROUNDS_ORDER = [
  'round-of-32',
  'round-of-16',
  'quarterfinals',
  'semifinals',
  '3rd-place',
  'final'
];

const ROUND_NAMES: Record<string, string> = {
  'round-of-32': 'Round of 32',
  'round-of-16': 'Round of 16',
  'quarterfinals': 'Quarter-Finals',
  'semifinals': 'Semi-Finals',
  '3rd-place': 'Third Place',
  'final': 'Final'
};

export function KnockoutViewer() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/knockouts')
      .then(r => r.json())
      .then(d => {
         setMatches(d);
         setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center opacity-50 animate-pulse">
         <Network className="w-12 h-12 text-white/20 mb-4" />
         <p className="text-white/50 text-xs font-bold tracking-widest uppercase">Loading Bracket...</p>
      </div>
    );
  }

  const grouped = ROUNDS_ORDER.reduce((acc, round) => {
    const rm = matches.filter(m => m.groupOrPhase === round).sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
    if (rm.length > 0) acc[round] = rm;
    return acc;
  }, {} as Record<string, Match[]>);

  if (Object.keys(grouped).length === 0) {
    return null; // Or show empty state
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase px-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          Knockout Stages Bracket
        </h2>
      </div>

      <div className="overflow-x-auto pb-12 custom-scrollbar">
         <div className="flex gap-8 min-w-max">
            {ROUNDS_ORDER.map(round => {
                const roundMatches = grouped[round];
                if (!roundMatches) return null;

                return (
                  <div key={round} className="w-72 flex flex-col gap-6">
                     <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center border-b border-white/10 pb-2">
                       {ROUND_NAMES[round] || round}
                     </h3>
                     <div className="flex flex-col gap-4">
                        {roundMatches.map(match => (
                           <MatchMiniCard key={match.id} match={match} />
                        ))}
                     </div>
                  </div>
                );
            })}
         </div>
      </div>
    </section>
  );
}

function MatchMiniCard({ match }: { match: Match }) {
  const isLive = match.status === 'LIVE';
  return (
     <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden"
     >
        {isLive && (
           <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
        )}
        <div className="flex justify-between items-center text-[9px] font-mono text-white/40 uppercase">
           <span>{new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {match.ukTime}</span>
           {isLive ? <span className="text-red-400 font-bold">{match.minute}</span> : <span>{match.status}</span>}
        </div>
        <div className="flex flex-col gap-1">
           <div className="flex justify-between items-center bg-white/5 rounded pl-1 pr-2 py-1">
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-[8px] font-bold">
                    {match.homeTeamLogo ? <img src={match.homeTeamLogo} className="w-full h-full object-cover" /> : match.homeTeam.substring(0,3)}
                 </div>
                 <span className="text-xs font-bold text-white truncate max-w-[120px]">{match.homeTeam}</span>
              </div>
              <span className="text-xs font-mono font-bold text-white/80 tabular-nums">{match.homeScore}</span>
           </div>
           <div className="flex justify-between items-center bg-white/5 rounded pl-1 pr-2 py-1">
              <div className="flex items-center gap-2">
                 <div className="w-4 h-4 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-[8px] font-bold">
                    {match.awayTeamLogo ? <img src={match.awayTeamLogo} className="w-full h-full object-cover" /> : match.awayTeam.substring(0,3)}
                 </div>
                 <span className="text-xs font-bold text-white truncate max-w-[120px]">{match.awayTeam}</span>
              </div>
              <span className="text-xs font-mono font-bold text-white/80 tabular-nums">{match.awayScore}</span>
           </div>
        </div>
     </motion.div>
  );
}
