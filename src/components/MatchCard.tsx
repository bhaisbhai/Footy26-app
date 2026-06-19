import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Match } from '../types';
import { Bell, BellOff, ChevronDown, ChevronUp, Clock, Activity, Users } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export function MatchCard({ 
  match, 
  isSubscribed, 
  onToggleSubscription,
  defaultExpanded = false
}: { 
  key?: React.Key | string | number;
  match: Match; 
  isSubscribed: boolean; 
  onToggleSubscription: (id: string) => void | Promise<void>;
  defaultExpanded?: boolean;
}) {
  const isLive = match.status === 'LIVE';
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'STATS' | 'EVENTS' | 'LINEUPS' | 'PREVIEW'>(match.status === 'UPCOMING' ? 'PREVIEW' : 'STATS');
  const [details, setDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isExpanded && !details) {
      setLoadingDetails(true);
      fetch(`/api/match/${match.id}`)
        .then(r => r.json())
        .then(data => {
          setDetails(data);
          setLoadingDetails(false);
        })
        .catch(() => setLoadingDetails(false));
    }
  }, [isExpanded, details, match.id]);

  const radarData = [
    { subject: 'Possession', A: match.homeStats?.possession || 50, B: match.awayStats?.possession || 50,  fullMark: 100 },
    { subject: 'Shots', A: match.homeStats?.shotsOnTarget || 0, B: match.awayStats?.shotsOnTarget || 0,  fullMark: 20 },
    { subject: 'Corners', A: match.homeStats?.corners || 0, B: match.awayStats?.corners || 0,  fullMark: 15 },
    { subject: 'Pass Acc%', A: match.homeStats?.passAccuracy || 80, B: match.awayStats?.passAccuracy || 80,  fullMark: 100 },
    { subject: 'Fouls', A: match.homeStats?.fouls || 0, B: match.awayStats?.fouls || 0,  fullMark: 25 },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f172a]/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl text-xs font-mono">
          <p className="text-white/40 mb-2 uppercase tracking-widest font-bold">{payload[0].payload.subject}</p>
          <div className="flex items-center justify-between gap-6">
             <span className="text-yellow-400 font-bold">{match.homeTeam.substring(0, 3).toUpperCase()}: {payload[0].value}</span>
             <span className="text-blue-400 font-bold">{match.awayTeam.substring(0, 3).toUpperCase()}: {payload[1].value}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      layout
      onClick={() => setIsExpanded(!isExpanded)}
      whileHover={{ scale: isExpanded ? 1 : 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`bg-[#0f172a]/40 hover:bg-[#0f172a]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 flex flex-col justify-between overflow-hidden relative group transition-colors ${isExpanded ? 'cursor-default' : 'cursor-pointer'} ${isExpanded ? 'md:col-span-2 lg:col-span-2 xl:col-span-3' : ''}`}
    >
      {/* Decorative gradient blob for LIVE matches */}
      {isLive && (
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-500/20 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}

      <div className="flex justify-between items-center mb-6 relative z-10">
        <span className="text-[10px] tracking-widest text-white/40 uppercase font-bold border border-white/10 px-2 py-1 rounded-md">
          {match.groupOrPhase}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isLive && (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              />
            )}
            <span className={`text-[10px] font-bold tracking-widest uppercase ${isLive ? 'text-red-400' : 'text-white/40'}`}>
              {match.status} {match.status === 'UPCOMING' && match.ukTime ? `• ${match.ukTime}` : match.time ? `• ${match.time}` : ''}
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSubscription(match.id);
            }}
            className={`p-1.5 rounded-full transition-colors ${isSubscribed ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white/80'}`}
            title={isSubscribed ? "Unsubscribe from live updates" : "Subscribe to live updates"}
          >
            {isSubscribed ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div className={`relative z-10 ${isExpanded ? 'flex flex-row items-center justify-between mt-8 mb-4 px-0 lg:px-12' : 'flex flex-col gap-4'}`}>
        
        {isExpanded ? (
          <>
            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-4 w-1/3">
              <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-white/5 border-[4px] border-white/10 flex items-center justify-center p-2 shadow-2xl relative">
                 <div className="absolute inset-0 rounded-full border-2 border-white/5 blur-sm" />
                 {match.homeTeamLogo ? (
                    <img src={match.homeTeamLogo} alt={match.homeTeam} className="w-full h-full object-cover rounded-full relative z-10" />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-white/20 to-white/5 rounded-full flex items-center justify-center text-lg md:text-3xl font-black text-white/90 shadow-inner z-10">
                     {match.homeTeam.substring(0, 3).toUpperCase()}
                   </div>
                 )}
              </div>
              <h2 className="text-sm md:text-2xl font-bold tracking-tight text-center truncate w-full">{match.homeTeam}</h2>
            </motion.div>

            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
              <div className="text-5xl md:text-7xl font-black tracking-tighter flex items-center gap-3 md:gap-6 drop-shadow-2xl">
                <span className={isLive ? 'text-white' : 'text-white/80'}>{match.status === 'UPCOMING' ? '-' : (match.homeScore || '0')}</span>
                <span className="text-3xl md:text-5xl text-white/10">:</span>
                <span className={isLive ? 'text-white' : 'text-white/80'}>{match.status === 'UPCOMING' ? '-' : (match.awayScore || '0')}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <span className="text-[10px] md:text-sm text-yellow-400/80 font-mono uppercase tracking-[0.2em] bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                  {match.status === 'UPCOMING' && match.ukTime ? match.ukTime : match.time}
                </span>
              </div>
            </motion.div>

            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col items-center gap-4 w-1/3">
              <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-white/5 border-[4px] border-white/10 flex items-center justify-center p-2 shadow-2xl relative">
                 <div className="absolute inset-0 rounded-full border-2 border-white/5 blur-sm" />
                 {match.awayTeamLogo ? (
                    <img src={match.awayTeamLogo} alt={match.awayTeam} className="w-full h-full object-cover rounded-full relative z-10" />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-tl from-white/20 to-white/5 rounded-full flex items-center justify-center text-lg md:text-3xl font-black text-white/90 shadow-inner z-10">
                     {match.awayTeam.substring(0, 3).toUpperCase()}
                   </div>
                 )}
              </div>
              <h2 className="text-sm md:text-2xl font-bold tracking-tight text-white/80 text-center truncate w-full">{match.awayTeam}</h2>
            </motion.div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs border border-white/20 font-bold overflow-hidden text-white/80 shadow-inner">
                   {match.homeTeamLogo ? <img src={match.homeTeamLogo} alt={match.homeTeam} className="w-full h-full object-cover" /> : match.homeTeam.substring(0, 3).toUpperCase()}
                </div>
                <span className="text-lg font-bold tracking-tight text-white/90">{match.homeTeam}</span>
              </div>
              <span className={`text-3xl font-black tabular-nums ${isLive ? 'text-white' : 'text-white/60'}`}>
                {match.status === 'UPCOMING' ? '-' : (match.homeScore || '-')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs border border-white/20 font-bold overflow-hidden text-white/80 shadow-inner">
                   {match.awayTeamLogo ? <img src={match.awayTeamLogo} alt={match.awayTeam} className="w-full h-full object-cover" /> : match.awayTeam.substring(0, 3).toUpperCase()}
                </div>
                <span className="text-lg font-bold tracking-tight text-white/90">{match.awayTeam}</span>
              </div>
              <span className={`text-3xl font-black tabular-nums ${isLive ? 'text-white' : 'text-white/60'}`}>
                {match.status === 'UPCOMING' ? '-' : (match.awayScore || '-')}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-white/10 relative z-10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
         <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">{match.date}</span>
         <div className="flex items-center gap-2">
            {isLive && <span className="text-[10px] uppercase font-bold tracking-widest text-red-500 mr-2 border border-red-500/20 px-2 py-0.5 rounded-sm bg-red-500/10">Live</span>}
            <div className="flex items-center gap-1 text-white/40 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-colors">
              <span className="text-[10px] uppercase font-bold tracking-widest">Details</span>
              {isExpanded ? <ChevronUp className="w-3" /> : <ChevronDown className="w-3" />}
            </div>
         </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden relative z-10"
            onClick={(e) => e.stopPropagation()} /* Prevent closing when clicking inside stats */
          >
            <div className="mt-6 border-t border-white/10 pt-4">
              
              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 p-1 bg-white/5 border border-white/5 rounded-xl w-fit overflow-x-auto custom-scrollbar">
                {(match.status === 'UPCOMING' || details?.odds?.length > 0) && (
                  <button onClick={() => setActiveTab('PREVIEW')} className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'PREVIEW' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}><Activity className="w-3" /> PREVIEW</button>
                )}
                {match.status !== 'UPCOMING' && (
                  <>
                    <button onClick={() => setActiveTab('STATS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'STATS' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}><Activity className="w-3" /> STATS</button>
                    <button onClick={() => setActiveTab('EVENTS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'EVENTS' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}><Clock className="w-3" /> EVENTS</button>
                    <button onClick={() => setActiveTab('LINEUPS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-widest transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'LINEUPS' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80'}`}><Users className="w-3" /> LINEUPS</button>
                  </>
                )}
              </div>

              {loadingDetails ? (
                <div className="py-12 flex justify-center text-white/20 text-xs font-mono tracking-widest animate-pulse">Loading data...</div>
              ) : (
                <div className="min-h-[200px]">
                  {/* PREVIEW VIEW */}
                  {activeTab === 'PREVIEW' && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 lg:p-8 space-y-8">
                       {details?.odds && details.odds[0] && details.odds[0].homeTeamOdds?.moneyLine && (
                          <div>
                            <h4 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">Win Probability (MoneyLine)</h4>
                            <div className="grid grid-cols-3 gap-4">
                               <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center">
                                  <span className="text-white/60 text-xs mb-1 font-bold">{match.homeTeam}</span>
                                  <span className="text-xl font-mono text-yellow-400">{details.odds[0].homeTeamOdds.moneyLine > 0 ? '+' : ''}{details.odds[0].homeTeamOdds.moneyLine}</span>
                               </div>
                               <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center">
                                  <span className="text-white/60 text-xs mb-1 font-bold">Draw</span>
                                  <span className="text-xl font-mono text-white/80">{details.odds[0].drawOdds?.moneyLine > 0 ? '+' : ''}{details.odds[0].drawOdds?.moneyLine}</span>
                               </div>
                               <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center">
                                  <span className="text-white/60 text-xs mb-1 font-bold">{match.awayTeam}</span>
                                  <span className="text-xl font-mono text-blue-400">{details.odds[0].awayTeamOdds.moneyLine > 0 ? '+' : ''}{details.odds[0].awayTeamOdds.moneyLine}</span>
                               </div>
                            </div>
                          </div>
                       )}
                       {details?.lastFiveGames && details.lastFiveGames.length === 2 && (
                          <div>
                             <h4 className="text-[10px] font-bold text-white/40 tracking-widest uppercase mb-4">Recent Form (Last 5 Matches)</h4>
                             <div className="flex flex-col gap-6">
                               {details.lastFiveGames.map((teamForm: any, idx: number) => (
                                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                     <div className="flex items-center gap-3 w-1/4">
                                        <span className="text-sm font-bold text-white/80">{teamForm.team?.displayName}</span>
                                     </div>
                                     <div className="flex items-center gap-2 flex-1">
                                        {teamForm.events?.map((ev: any, eIdx: number) => {
                                           const isWin = ev.gameResult === 'W';
                                           const isLoss = ev.gameResult === 'L';
                                           const isDraw = ev.gameResult === 'D';
                                           return (
                                             <div key={eIdx} title={ev.opponent?.displayName} className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold font-mono ${isWin ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : isLoss ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/10 text-white/60 border border-white/20'}`}>
                                                {ev.gameResult}
                                             </div>
                                           );
                                        })}
                                     </div>
                                  </div>
                               ))}
                             </div>
                          </div>
                       )}
                    </div>
                  )}

                  {/* STATS VIEW */}
                  {activeTab === 'STATS' && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 md:p-6 lg:p-8">
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="w-full md:w-1/2 flex flex-col gap-6">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-white/40 tracking-widest px-1">
                              <span>POSSESSION</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-yellow-400 font-mono text-sm w-10 text-right">{match.homeStats?.possession || 50}%</span>
                              <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                                <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-1000" style={{ width: `${match.homeStats?.possession || 50}%` }}></div>
                                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000" style={{ width: `${match.awayStats?.possession || 50}%` }}></div>
                              </div>
                              <span className="text-blue-400 font-mono text-sm w-10 text-left">{match.awayStats?.possession || 50}%</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-white/40 tracking-widest px-1">
                              <span>PASS ACCURACY</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-yellow-400 font-mono text-sm w-10 text-right">{match.homeStats?.passAccuracy || 80}%</span>
                              <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden flex shadow-inner">
                                <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-1000" style={{ width: `${match.homeStats?.passAccuracy || 80}%` }}></div>
                                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000" style={{ width: `${match.awayStats?.passAccuracy || 80}%` }}></div>
                              </div>
                              <span className="text-blue-400 font-mono text-sm w-10 text-left">{match.awayStats?.passAccuracy || 80}%</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mt-2">
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner">
                              <span className="text-[10px] font-bold text-white/30 tracking-widest mb-2">SHOTS</span>
                              <div className="flex items-center gap-3 font-mono text-lg">
                                <span className="text-yellow-400">{match.homeStats?.shotsOnTarget || 0}</span>
                                <span className="text-white/20">-</span>
                                <span className="text-blue-400">{match.awayStats?.shotsOnTarget || 0}</span>
                              </div>
                            </div>
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner">
                              <span className="text-[10px] font-bold text-white/30 tracking-widest mb-2">CORNERS</span>
                              <div className="flex items-center gap-3 font-mono text-lg">
                                <span className="text-yellow-400">{match.homeStats?.corners || 0}</span>
                                <span className="text-white/20">-</span>
                                <span className="text-blue-400">{match.awayStats?.corners || 0}</span>
                              </div>
                            </div>
                            <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center shadow-inner">
                              <span className="text-[10px] font-bold text-white/30 tracking-widest mb-2">FOULS</span>
                              <div className="flex items-center gap-3 font-mono text-lg">
                                <span className="text-yellow-400">{match.homeStats?.fouls || 0}</span>
                                <span className="text-white/20">-</span>
                                <span className="text-blue-400">{match.awayStats?.fouls || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full md:w-1/2 h-64 border-t md:border-l md:border-t-0 border-white/5 pl-0 md:pl-8 pt-6 md:pt-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                              <PolarGrid stroke="rgba(255,255,255,0.1)" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 'bold' }} />
                              <Tooltip content={<CustomTooltip />} />
                              <Radar name={match.homeTeam} dataKey="A" stroke="#facc15" fill="#facc15" fillOpacity={0.3} />
                              <Radar name={match.awayTeam} dataKey="B" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.3} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EVENTS VIEW */}
                  {activeTab === 'EVENTS' && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 h-[300px] overflow-y-auto custom-scrollbar">
                      {details?.keyEvents && details.keyEvents.length > 0 ? (
                        <div className="space-y-4">
                          {details.keyEvents.map((evt: any) => (
                             <div key={evt.id} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0">
                               <div className="w-12 shrink-0 py-1 flex justify-center">
                                 <span className="text-xs font-mono text-white/60 bg-black/40 px-2 py-0.5 border border-white/10 rounded-md">
                                   {evt.clock ? evt.clock : "•"}
                                 </span>
                               </div>
                               <div className="flex-1">
                                 <h4 className="text-xs font-bold text-white/80 uppercase tracking-wide mb-1">{evt.type}</h4>
                                 <p className="text-sm text-white/50 leading-relaxed font-sans">{evt.text}</p>
                               </div>
                             </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/30 text-xs py-8 text-center font-mono">No events reported yet.</p>
                      )}
                    </div>
                  )}

                  {/* LINEUPS VIEW */}
                  {activeTab === 'LINEUPS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {details?.rosters ? details.rosters.map((roster: any, idx: number) => (
                        <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-6">
                           <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                             <h3 className="font-bold tracking-widest text-sm text-white/90">{roster.teamName}</h3>
                             <span className="text-[10px] font-mono tracking-widest text-white/40 bg-white/5 px-2 py-1 rounded-sm">{roster.formation || 'Lineup'}</span>
                           </div>
                           <div className="space-y-3">
                             <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Starters</div>
                             {roster.players.filter((p:any) => p.starter).map((player: any) => (
                               <div key={player.id} className="flex items-center justify-between group cursor-default">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-white/30 w-6 group-hover:text-white/80 transition-colors">{player.jersey}</span>
                                    <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{player.shortName || player.name}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">{player.position}</span>
                               </div>
                             ))}
                             
                             <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-6 mb-3 pt-4 border-t border-white/5">Substitutes</div>
                             {roster.players.filter((p:any) => !p.starter).map((player: any) => (
                               <div key={player.id} className="flex items-center justify-between opacity-60">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-white/30 w-6">{player.jersey}</span>
                                    <span className="text-sm font-medium text-white/70">{player.shortName || player.name}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-white/20 uppercase tracking-wider">{player.position}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                      )) : (
                        <div className="col-span-2 text-center text-white/30 text-xs py-8 font-mono">Lineups not available</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
