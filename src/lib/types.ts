export type BetResult = 'won' | 'lost' | 'pending' | 'cashed_out' | 'void';

export type Sport = 'Football' | 'Basketball' | 'Tennis' | 'Baseball' | 'Other';

export type BetType = 'single' | 'surebet';

export type Bet = {
  id: string;
  sport: Sport;
  event: string;
  market: string;
  selection: string;
  stake?: number;
  odds?: number;
  result?: BetResult;
  status: BetResult;
  date: string | Date; // Using ISO string for date for easy serialization
  type: BetType;
  totalStake?: number;
  guaranteedProfit?: number;
  bets?: {
    house: string;
    stake: number;
    odds: number;
  }[];
};
