import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ChevronDown } from 'lucide-react';

export function Standings() {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/standings')
      .then(r => r.json())
      .then(d => {
         setStandings(d);
         setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading || standings.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-bold tracking-widest text-white/40 uppercase px-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          Tournament Standings
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {standings.map((group, idx) => (
            <motion.div 
               key={group.name}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               transition={{ duration: 0.3, delay: idx * 0.05 }}
               className="bg-[#0f172a]/40 border border-white/5 rounded-[2rem] p-6 shadow-inner"
            >
               <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">{group.name}</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead>
                     <tr className="text-[10px] text-white/30 uppercase tracking-widest border-b border-white/5">
                       <th className="pb-3 w-8">Pos</th>
                       <th className="pb-3">Team</th>
                       <th className="pb-3 text-center w-8">P</th>
                       <th className="pb-3 text-center w-8">W</th>
                       <th className="pb-3 text-center w-8">D</th>
                       <th className="pb-3 text-center w-8">L</th>
                       <th className="pb-3 text-center w-8">GD</th>
                       <th className="pb-3 text-center w-10 text-white/60">Pts</th>
                     </tr>
                   </thead>
                   <tbody>
                     {group.entries?.map((entry: any, i: number) => (
                       <tr key={entry.team} className="border-b border-white/[0.02] last:border-0">
                         <td className="py-3 font-mono text-white/40 text-xs">{i + 1}</td>
                         <td className="py-3 font-bold text-white/90">
                           <div className="flex items-center gap-3">
                             {entry.logo ? (
                               <img src={entry.logo} alt={entry.team} className="w-5 h-5 object-contain opacity-80" />
                             ) : (
                               <div className="w-5 h-5 rounded-full bg-white/10" />
                             )}
                             <span className="truncate max-w-[120px] sm:max-w-[160px]">{entry.team}</span>
                           </div>
                         </td>
                         <td className="py-3 text-center text-white/40 font-mono text-xs">{entry.gp}</td>
                         <td className="py-3 text-center text-white/60 font-mono text-xs">{entry.w}</td>
                         <td className="py-3 text-center text-white/60 font-mono text-xs">{entry.d}</td>
                         <td className="py-3 text-center text-white/60 font-mono text-xs">{entry.l}</td>
                         <td className="py-3 text-center text-white/60 font-mono text-xs">{parseFloat(entry.gd) > 0 ? `+${entry.gd}` : entry.gd}</td>
                         <td className="py-3 text-center text-white font-bold text-sm bg-white/5 rounded-r-lg">{entry.points}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
