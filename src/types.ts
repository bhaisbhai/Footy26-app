export interface MatchStats {
  possession: number;
  shotsOnTarget: number;
  corners: number;
  passAccuracy: number;
  fouls: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: 'LIVE' | 'FINISHED' | 'UPCOMING';
  time: string;
  date: string;
  groupOrPhase: string;
  homeStats?: MatchStats;
  awayStats?: MatchStats;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  ukTime?: string;
  timestamp?: number;
}
