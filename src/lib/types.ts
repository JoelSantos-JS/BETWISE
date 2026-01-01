export interface SubBet {
    id: string;
    bookmaker: string; // Casa de apostas
    betType: string;
    odds: number;
    stake: number;
    isFreebet?: boolean;
}

export interface Bookmaker {
    id: string;
    name: string;
    initialBankroll: number;
}

export type OutcomeScenario = 'standard' | 'double_green' | 'pa_hedge';

export interface FreeSpin {
  id: string;
  bookmaker: string;
  spinsCount: number;
  wonAmount: number;
  date: Date;
}

export interface Bet {
  id: string;
  type: 'single' | 'surebet' | 'pa_surebet';
  sport: string;
  event: string;
  date: Date;
  status: 'pending' | 'won' | 'lost' | 'cashed_out' | 'void';
  notes?: string;
  earnedFreebetValue?: number | null; // Valor da freebet ganha com esta aposta
  realizedProfit?: number | null; // Lucro final real inserido manualmente
  outcomeScenario?: OutcomeScenario | null; // Cenário de resolução da aposta

  // For 'single' bets
  bookmaker?: string | null; // Associated bookmaker
  betType?: string | null;
  stake?: number | null;
  odds?: number | null;
  
  // For 'surebet' or 'pa_surebet'
  subBets?: SubBet[] | null;
  totalStake?: number | null;
  guaranteedProfit?: number | null;
  profitPercentage?: number | null;
}
