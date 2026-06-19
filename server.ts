import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  
  // Connected SSE clients
  const sseClients = new Set<express.Response>();
  let cachedMatches: any[] = [];
  let isFetching = false;

  const broadcastEvent = (eventData: any) => {
    const dataStr = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      client.write(dataStr);
    }
  };

  const fetchMatchesData = async () => {
    if (isFetching) return;
    isFetching = true;
    
    broadcastEvent({ type: "FETCH_STATE", loading: true });
    
    try {
      const leagues = ['fifa.world'];
      let allMatches: any[] = [];

      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 10);
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 10);

      const formatDate = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}${mm}${dd}`;
      };

      const dateStrQuery = `${formatDate(pastDate)}-${formatDate(futureDate)}`;

      for (const l of leagues) {
        try {
          const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l}/scoreboard?dates=${dateStrQuery}`);
          if (!r.ok) continue;
          
          const data = await r.json();
          for (const ev of data.events || []) {
            const comp = ev.competitions[0];
            const home = comp.competitors.find((c: any) => c.homeAway === 'home');
            const away = comp.competitors.find((c: any) => c.homeAway === 'away');
            
            let status = 'UPCOMING';
            if (ev.status.type.state === 'in') status = 'LIVE';
            else if (ev.status.type.state === 'post') status = 'FINISHED';

            let homeStats = { possession: 50, shotsOnTarget: 0, corners: 0, passAccuracy: 0, fouls: 0 };
            let awayStats = { possession: 50, shotsOnTarget: 0, corners: 0, passAccuracy: 0, fouls: 0 };

            try {
              const sumReq = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${l}/summary?event=${ev.id}`);
              if (sumReq.ok) {
                const sumData = await sumReq.json();
                const teamsStat = sumData?.boxscore?.teams;
                
                if (teamsStat && teamsStat.length >= 2) {
                   const ht = teamsStat.find((t: any) => t.homeAway === 'home');
                   const at = teamsStat.find((t: any) => t.homeAway === 'away');
                   
                   if (ht && ht.statistics) {
                     const st = ht.statistics;
                     const pPct = st.find((s: any) => s.name === 'possessionPct')?.displayValue;
                     if (pPct) homeStats.possession = parseFloat(pPct);
                     
                     homeStats.shotsOnTarget = parseInt(st.find((s: any) => s.name === 'shotsOnTarget')?.displayValue || '0', 10);
                     homeStats.corners = parseInt(st.find((s: any) => s.name === 'wonCorners')?.displayValue || '0', 10);
                     homeStats.passAccuracy = parseFloat(st.find((s: any) => s.name === 'passPct')?.displayValue || '0') * 100;
                     homeStats.fouls = parseInt(st.find((s: any) => s.name === 'foulsCommitted')?.displayValue || '0', 10);
                   }
                   if (at && at.statistics) {
                     const st = at.statistics;
                     const pPct = st.find((s: any) => s.name === 'possessionPct')?.displayValue;
                     if (pPct) awayStats.possession = parseFloat(pPct);
                     
                     awayStats.shotsOnTarget = parseInt(st.find((s: any) => s.name === 'shotsOnTarget')?.displayValue || '0', 10);
                     awayStats.corners = parseInt(st.find((s: any) => s.name === 'wonCorners')?.displayValue || '0', 10);
                     awayStats.passAccuracy = parseFloat(st.find((s: any) => s.name === 'passPct')?.displayValue || '0') * 100;
                     awayStats.fouls = parseInt(st.find((s: any) => s.name === 'foulsCommitted')?.displayValue || '0', 10);
                   }
                }
              }
            } catch(e) {
              console.error(`Failed to fetch summary for ${ev.id}`);
            }

            const dateStr = new Date(ev.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const ukTime = new Date(ev.date).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }) + ' UK';

            allMatches.push({
              id: ev.id,
              homeTeam: home?.team?.name || 'Home',
              awayTeam: away?.team?.name || 'Away',
              homeScore: home?.score || '0',
              awayScore: away?.score || '0',
              status,
              time: ev.status.displayClock || ev.status.type.shortDetail,
              date: dateStr,
              groupOrPhase: data.leagues?.[0]?.name || 'Match',
              homeStats,
              awayStats,
              homeTeamLogo: home?.team?.logo || undefined,
              awayTeamLogo: away?.team?.logo || undefined,
              ukTime,
              timestamp: new Date(ev.date).getTime()
            });
          }
        } catch(e) {
          console.error(`Error fetching league ${l}`, e);
        }
      }

      if (allMatches.length > 0) {
        const uniqueMatches = [];
        const seenIds = new Set();
        for (const match of allMatches) {
          if (!seenIds.has(match.id)) {
            uniqueMatches.push(match);
            seenIds.add(match.id);
          }
        }
        cachedMatches = uniqueMatches;
      }
      broadcastEvent({ type: "MATCH_UPDATE", matches: cachedMatches });

    } catch (error: any) {
      console.error("API Error: ", error);
      broadcastEvent({ type: "ERROR", error: error.message || "Failed to fetch match data" });
    } finally {
      isFetching = false;
      broadcastEvent({ type: "FETCH_STATE", loading: false });
    }
  };

  // Background poller that runs every 30 seconds to fetch live data
  setInterval(() => {
    // Only poll if we have connected UI clients
    if (sseClients.size > 0) {
      fetchMatchesData();
    }
  }, 30000);

  // Keep-alive heartbeat every 15 seconds to prevent proxy disconnects
  setInterval(() => {
    for (const client of sseClients) {
      client.write(":\n\n"); // Send a comment to keep connection alive
    }
  }, 15000);

  // SSE Stream endpoint
  app.get("/api/matches/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    sseClients.add(res);

    // Initial send state
    if (cachedMatches.length > 0) {
      res.write(`data: ${JSON.stringify({ type: "MATCH_UPDATE", matches: cachedMatches })}\n\n`);
    } else {
      // If we don't have matches cached yet, trigger a fetch
      fetchMatchesData();
    }

    req.on("close", () => {
      sseClients.delete(res);
    });
  });
  
  // Endpoint to manually force a refresh from the UI
  app.post("/api/matches/refresh", (req, res) => {
    fetchMatchesData();
    res.json({ success: true });
  });

  // Fetch match specifics like lineups, timeline
  app.get("/api/match/:id", async (req, res) => {
    try {
       const reqData = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${req.params.id}`);
       if (!reqData.ok) {
           return res.status(500).json({ error: "Failed to fetch top match detail" });
       }
       const sumData = await reqData.json();

       const keyEvents = (sumData.keyEvents || []).map((k: any) => ({
           id: k.id,
           text: k.text,
           type: k.type?.text,
           clock: k.clock?.displayValue || k.clock?.value || ''
       }));

       const rosters = sumData.rosters ? sumData.rosters.map((r: any) => ({
           teamId: r.team?.id,
           teamName: r.team?.displayName,
           formation: r.formation,
           players: (r.roster || []).map((p: any) => ({
             id: p.athlete?.id,
             name: p.athlete?.displayName,
             shortName: p.athlete?.shortName,
             jersey: p.jersey,
             position: p.position?.name,
             starter: p.starter,
             stats: p.stats?.map((s:any) => ({ name: s.displayName, value: s.displayValue })) || [],
           }))
       })) : [];

       res.json({ 
           keyEvents, 
           rosters, 
           boxscore: sumData.boxscore,
           lastFiveGames: sumData.lastFiveGames,
           odds: sumData.pickcenter || sumData.odds
       });
    } catch(e) {
       res.status(500).json({ error: "Exception fetching" });
    }
  });

  // Fetch top 32 group stage standings
  app.get("/api/standings", async (req, res) => {
    try {
       const reqData = await fetch(`https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings?season=2026`);
       if (!reqData.ok) {
           return res.status(500).json({ error: "Failed to fetch standings" });
       }
       const sumData = await reqData.json();

       let groups = [];
       if (sumData.children) {
           groups = sumData.children.map((g: any) => ({
                name: g.name,
                entries: g.standings?.entries?.map((e: any) => {
                    const stats = e.stats || [];
                    const getStat = (t:string) => stats.find((s:any) => s.name === t)?.value || 0;
                    return {
                        team: e.team?.displayName || e.team?.name,
                        logo: e.team?.logos?.[0]?.href,
                        points: getStat("points"),
                        gp: getStat("gamesPlayed"),
                        w: getStat("wins"),
                        d: getStat("ties"),
                        l: getStat("losses"),
                        gd: getStat("pointDifferential"),
                    };
                })
           }));
       }
       res.json(groups);
    } catch(e) {
       res.status(500).json({ error: "Exception fetching" });
    }
  });

  // Fetch knockout matches
  app.get("/api/knockouts", async (req, res) => {
    try {
       const reqData = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=2026&limit=200`);
       if (!reqData.ok) {
           return res.status(500).json({ error: "Failed to fetch Knockouts" });
       }
       const data = await reqData.json();

       const knockoutMatches = data.events?.filter((ev: any) => ev.season?.slug !== 'group-stage') || [];

       const mapped = knockoutMatches.map((ev: any) => {
            const comp = ev.competitions[0];
            const home = comp.competitors.find((c: any) => c.homeAway === 'home');
            const away = comp.competitors.find((c: any) => c.homeAway === 'away');

            const date = new Date(ev.date);
            const ukTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

            return {
              id: ev.id,
              date: ev.date,
              status: ev.status.type.state === 'pre' ? 'UPCOMING' : ev.status.type.state === 'in' ? 'LIVE' : 'FINISHED',
              homeTeam: home?.team?.displayName || home?.team?.name || 'TBD',
              awayTeam: away?.team?.displayName || away?.team?.name || 'TBD',
              homeScore: parseInt(home?.score || '0', 10),
              awayScore: parseInt(away?.score || '0', 10),
              minute: ev.status.type.state === 'in' ? ev.status.displayClock : undefined,
              groupOrPhase: ev.season?.slug || ev.competitions[0]?.altGameNote || 'Knockout',
              homeTeamLogo: home?.team?.logo || undefined,
              awayTeamLogo: away?.team?.logo || undefined,
              ukTime,
              timestamp: new Date(ev.date).getTime()
            };
       });

       res.json(mapped);
    } catch(e) {
       res.status(500).json({ error: "Exception fetching knockouts" });
    }
  });

  // Fetch top scorers and other tournament stats
  app.get("/api/statistics", async (req, res) => {
    try {
       const reqData = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/statistics?limit=50`);
       if (!reqData.ok) {
           return res.status(500).json({ error: "Failed to fetch top statistics" });
       }
       const statData = await reqData.json();
       const stats = statData.stats?.map((s: any) => ({
           name: s.name,
           displayName: s.displayName,
           leaders: s.leaders?.map((l:any) => ({
               value: l.value,
               displayValue: l.displayValue,
               athleteName: l.athlete?.displayName,
               athleteTeam: l.athlete?.team?.name,
               athleteTeamLogo: l.athlete?.team?.logo,
               athleteHeadshot: l.athlete?.headshot?.href
           }))
       })) || [];

       // Aggregate extra stats
       try {
           const matchesData = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=2026&limit=200`);
           const matchesJson = await matchesData.json();

           const yellowCards: Record<string, any> = {};
           const redCards: Record<string, any> = {};
           const cleanSheets: Record<string, any> = {};

           (matchesJson.events || []).forEach((ev: any) => {
              const comp = ev.competitions?.[0];
              if (!comp) return;

              // Compute clean sheets (only for FULL_TIME matches)
              if (ev.status?.type?.completed) {
                  const home = comp.competitors.find((c:any) => c.homeAway === 'home');
                  const away = comp.competitors.find((c:any) => c.homeAway === 'away');
                  
                  if (home && away) {
                      const hScore = parseInt(home.score || '0', 10);
                      const aScore = parseInt(away.score || '0', 10);

                      if (aScore === 0) {
                          const tId = home.team?.id;
                          if (tId && !cleanSheets[tId]) cleanSheets[tId] = { team: home.team, count: 0 };
                          if (tId) cleanSheets[tId].count += 1;
                      }
                      if (hScore === 0) {
                          const tId = away.team?.id;
                          if (tId && !cleanSheets[tId]) cleanSheets[tId] = { team: away.team, count: 0 };
                          if (tId) cleanSheets[tId].count += 1;
                      }
                  }
              }

              // Compute cards
              (comp.details || []).forEach((det: any) => {
                  if (det.yellowCard || det.redCard) {
                       const athletes = det.athletesInvolved || [];
                       athletes.forEach((ath: any) => {
                           const aId = ath.id;
                           if (det.yellowCard) {
                               if (!yellowCards[aId]) yellowCards[aId] = { athlete: ath, count: 0, teamId: det.team?.id };
                               yellowCards[aId].count += 1;
                           }
                           if (det.redCard) {
                               if (!redCards[aId]) redCards[aId] = { athlete: ath, count: 0, teamId: det.team?.id };
                               redCards[aId].count += 1;
                           }
                       });
                  }
              });
           });

           // Get ESPN team data for mapping logos
           const teamLogoMap: Record<string, string> = {};
           const teamNameMap: Record<string, string> = {};
           (matchesJson.events || []).forEach((ev: any) => {
               ev.competitions?.[0]?.competitors?.forEach((c: any) => {
                   if (c.team?.id) {
                       teamLogoMap[c.team.id] = c.team.logo;
                       teamNameMap[c.team.id] = c.team.displayName || c.team.name;
                   }
               });
           });

           // Format Clean Sheets
           const csArray = Object.values(cleanSheets).sort((a: any, b: any) => b.count - a.count).slice(0, 10);
           if (csArray.length > 0) {
               stats.push({
                   name: 'cleanSheets',
                   displayName: 'Team Clean Sheets',
                   leaders: csArray.map((c: any) => ({
                       value: c.count,
                       displayValue: c.count.toString(),
                       athleteName: c.team?.displayName || c.team?.name,
                       athleteTeam: undefined,
                       athleteTeamLogo: c.team?.logo || teamLogoMap[c.team?.id],
                       athleteHeadshot: c.team?.logo || teamLogoMap[c.team?.id]
                   }))
               });
           }

           // Format Yellow Cards
           const ycArray = Object.values(yellowCards).sort((a: any, b: any) => b.count - a.count).slice(0, 10);
           if (ycArray.length > 0) {
               stats.push({
                   name: 'yellowCards',
                   displayName: 'Yellow Cards',
                   leaders: ycArray.map((y: any) => ({
                       value: y.count,
                       displayValue: y.count.toString(),
                       athleteName: y.athlete?.displayName || y.athlete?.shortName,
                       athleteTeam: teamNameMap[y.teamId],
                       athleteTeamLogo: teamLogoMap[y.teamId],
                   }))
               });
           }

           // Format Red Cards
           const rcArray = Object.values(redCards).sort((a: any, b: any) => b.count - a.count).slice(0, 10);
           if (rcArray.length > 0) {
               stats.push({
                   name: 'redCards',
                   displayName: 'Red Cards',
                   leaders: rcArray.map((r: any) => ({
                       value: r.count,
                       displayValue: r.count.toString(),
                       athleteName: r.athlete?.displayName || r.athlete?.shortName,
                       athleteTeam: teamNameMap[r.teamId],
                       athleteTeamLogo: teamLogoMap[r.teamId],
                   }))
               });
           }

           // Format Players to Watch (Goals + Assists + Cards combined impact)
           const playersObj: Record<string, any> = {};
           
           stats.forEach(s => {
              if (s.name === 'goalsLeaders' || s.name === 'assistsLeaders' || s.name === 'yellowCards' || s.name === 'redCards') {
                  s.leaders.forEach((l: any) => {
                     let id = l.athleteName;
                     if (!playersObj[id]) {
                         playersObj[id] = { athleteName: l.athleteName, athleteTeam: l.athleteTeam, athleteTeamLogo: l.athleteTeamLogo, athleteHeadshot: l.athleteHeadshot, goals: 0, assists: 0, yds: 0, rds: 0, points: 0 };
                     }
                     if (s.name === 'goalsLeaders') {
                         playersObj[id].goals += l.value;
                         playersObj[id].points += l.value * 3; // Weight goals higher
                     }
                     if (s.name === 'assistsLeaders') {
                         playersObj[id].assists += l.value;
                         playersObj[id].points += l.value * 2;
                     }
                     if (s.name === 'yellowCards') {
                         playersObj[id].yds += l.value;
                         playersObj[id].points -= l.value * 0.5;
                     }
                     if (s.name === 'redCards') {
                         playersObj[id].rds += l.value;
                         playersObj[id].points -= l.value * 2;
                     }
                  });
              }
           });

           const watchArray = Object.values(playersObj).filter(p => p.points > 0).sort((a:any, b:any) => b.points - a.points).slice(0, 15);
           
           if (watchArray.length > 0) {
               stats.unshift({ // Add to the top
                   name: 'playersToWatch',
                   displayName: 'Players to Watch (Performance Rating)',
                   leaders: watchArray.map((p:any) => {
                       const parts = [];
                       if (p.goals > 0) parts.push(`${p.goals} G`);
                       if (p.assists > 0) parts.push(`${p.assists} A`);
                       if (p.yds > 0) parts.push(`${p.yds} YC`);
                       if (p.rds > 0) parts.push(`${p.rds} RC`);
                       return {
                           value: Math.round(p.points * 10) / 10,
                           displayValue: parts.join(', '),
                           athleteName: p.athleteName,
                           athleteTeam: p.athleteTeam,
                           athleteTeamLogo: p.athleteTeamLogo,
                           athleteHeadshot: p.athleteHeadshot
                       };
                   })
               });
           }

       } catch (innerErr) {
           console.error("Failed to aggregate extra stats", innerErr);
       }

       res.json(stats);
    } catch(e) {
       res.status(500).json({ error: "Exception fetching" });
    }
  });

  // Fetch news
  app.get("/api/news", async (req, res) => {
    try {
       const reqData = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news`);
       if (!reqData.ok) {
           return res.status(500).json({ error: "Failed to fetch top news" });
       }
       const newsData = await reqData.json();
       res.json(newsData.articles || []);
    } catch(e) {
       res.status(500).json({ error: "Exception fetching news" });
    }
  });

  // YouTube Highlights Endpoint
  app.get("/api/highlights", async (req, res) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        return res.status(400).json({ error: "Missing query" });
      }

      // Hardcoded fallback for demonstration since the user explicitly provided it
      const API_KEY = process.env.YOUTUBE_API_KEY || "AIzaSyBvUlbLkg1RAdPyFmuADmOS_0a2277PUkA";
      const searchQuery = `BBC Sport Highlights ${q} World Cup`;

      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${API_KEY}&maxResults=1`);
      
      if (!response.ok) {
        return res.status(500).json({ error: "Failed to fetch highlights from YouTube" });
      }

      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      console.error("Highlights Exception:", e);
      res.status(500).json({ error: e.message || "Something went wrong fetching highlights" });
    }
  });

  // Fantasy Team Recommendation endpoint
  app.post("/api/fantasy-recommend", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing image data" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is missing. Please configure it in the app settings." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let contextString = "";
      try {
        const matchesData = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=2026&limit=200`);
        const matchesJson = await matchesData.json();
        
        const recentEvents = (matchesJson.events || [])
            .filter((ev: any) => ev.status?.type?.completed)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 15);
            
        const upcomingEvents = (matchesJson.events || [])
            .filter((ev: any) => !ev.status?.type?.completed)
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 15);

        contextString = `\n\nHere is some recent context to help your analysis:\n\nRecent Match Results:\n`;
        recentEvents.forEach((ev: any) => {
            contextString += `- ${ev.name} (${ev.status?.type?.shortDetail})\n`;
        });
        
        contextString += `\nUpcoming Fixtures:\n`;
        upcomingEvents.forEach((ev: any) => {
            contextString += `- ${ev.name} (${new Date(ev.date).toLocaleDateString()})\n`;
        });
      } catch(err) {
        console.error("Could not fetch context for fantasy", err);
      }

      const prompt = `You are an expert fantasy football analyst. Based on this screenshot of my fantasy football team:
1. Identify the players and formation if visible.
2. Analyze the strengths and weaknesses of my current squad.
3. Highlight players who are likely to overperform or underperform in upcoming fixtures based on form or team matchups.
4. Give me 2-3 specific recommendations (transfers, captaincy choice, or positional adjustments) to optimize my points.
Be concise, analytical, and format your response in clean Markdown with headers and bullet points.${contextString}`;

      // Extract base64 part if formatted as data URL
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              }
            ]
          }
        ]
      });

      res.json({ recommendation: response.text });
    } catch (e: any) {
      console.error("Fantasy Recommend Exception:", e);
      if (e.status === 429 || e.message?.includes('429') || e.message?.includes('Quota')) {
         return res.status(429).json({ error: "The AI analysis model has reached its daily rate limit cap. Please try again later." });
      }
      res.status(500).json({ error: e.message || "Failed to generate fantasy recommendations" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
