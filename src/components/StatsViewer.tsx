import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Goal, Users, Target, Shield, Square, AlertTriangle, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { PlayerHeatmap } from './PlayerHeatmap';

function getStatIcon(name: string) {
  if (name.toLowerCase().includes('watch')) return <Star className="w-4 h-4 text-amber-400" />;
  if (name.toLowerCase().includes('goal')) return <Goal className="w-4 h-4 text-emerald-400" />;
  if (name.toLowerCase().includes('assist')) return <Users className="w-4 h-4 text-blue-400" />;
  if (name.toLowerCase().includes('clean')) return <Shield className="w-4 h-4 text-slate-400" />;
  if (name.toLowerCase().includes('yellow') || name.toLowerCase().includes('card')) return <Square className="w-4 h-4 text-yellow-400" />;
  if (name.toLowerCase().includes('red')) return <AlertTriangle className="w-4 h-4 text-red-500" />;
  return <Activity className="w-4 h-4 text-purple-400" />;
}

export function StatsViewer() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/statistics')
      .then(r => r.json())
      .then(d => {
         setStats(d);
         setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || stats.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase px-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Tournament Leaders
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((statCategory, idx) => (
          <motion.div 
             key={statCategory.name}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3, delay: idx * 0.1 }}
             className="bg-[#0f172a]/40 border border-white/5 rounded-[2rem] p-6 shadow-md"
          >
             <h3 className="text-xs font-bold uppercase tracking-widest text-white/80 mb-6 flex items-center gap-2">
                {getStatIcon(statCategory.name)}
                {statCategory.displayName}
             </h3>
             <div className="space-y-4">
               {statCategory.leaders?.slice(0, 10).map((leader: any, i: number) => {
                 const isExpanded = expandedPlayer === `${statCategory.name}-${leader.athleteName}-${i}`;
                 const isTeamStat = statCategory.name === 'cleanSheets';
                 
                 return (
                 <div key={i} className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-colors">
                   <div 
                     onClick={() => {
                        if (isTeamStat) return;
                        setExpandedPlayer(isExpanded ? null : `${statCategory.name}-${leader.athleteName}-${i}`);
                     }}
                     className={`flex items-center gap-4 p-3 ${!isTeamStat ? 'cursor-pointer hover:bg-white/5' : ''}`}
                   >
                    <div className="w-6 text-center text-xs font-mono font-bold text-white/30 group-hover:text-white/60 transition-colors">
                      {i + 1}
                    </div>
                    {leader.athleteHeadshot ? (
                      <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border border-white/10 shrink-0">
                         <img src={leader.athleteHeadshot} alt={leader.athleteName} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 shrink-0 flex items-center justify-center">
                         <span className="text-white/40 text-xs font-bold">{leader.athleteName?.substring(0,2).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{leader.athleteName}</div>
                      <div className="text-xs font-mono text-white/40 truncate flex items-center gap-1">
                        {leader.athleteTeamLogo && <img src={leader.athleteTeamLogo} className="w-3 h-3 opacity-60" />}
                        {leader.athleteTeam}
                      </div>
                    </div>
                    <div className={`text-lg font-black font-mono tabular-nums flex items-center gap-3 ${
                       statCategory.name.toLowerCase().includes('watch') ? 'text-amber-400 text-sm whitespace-nowrap' : 
                       statCategory.name.toLowerCase().includes('goal') ? 'text-emerald-400' : 
                       statCategory.name.toLowerCase().includes('assist') ? 'text-blue-400' : 'text-white/80'
                    }`}>
                      {statCategory.name.toLowerCase().includes('watch') ? leader.displayValue : leader.value}
                      {!isTeamStat && (
                         isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && !isTeamStat && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3 overflow-hidden"
                      >
                         <PlayerHeatmap athleteName={leader.athleteName} position={statCategory.name.includes('goal') ? 'Attacker' : 'Midfielder'} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                 </div>
               )})}
             </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
