export type BetResult = 'won' | 'lost' | 'pending';

export type Sport = 'Football' | 'Basketball' | 'Tennis' | 'Baseball' | 'Other';

export type Bet = {
  id: string;
  sport: Sport;
  match: string;
  market: string;
  selection: string;
  stake: number;
  odds: number;
  result: BetResult;
  date: string; // Using ISO string for date for easy serialization
};
