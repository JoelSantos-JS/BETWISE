'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Bet, Sport, BetResult } from '@/lib/types';
import { INITIAL_BETS } from '@/lib/data';
import type { DateRange } from 'react-day-picker';

const isServer = typeof window === 'undefined';

type BetFilters = {
  sport: Sport | 'all';
  result: BetResult | 'all';
  dateRange: DateRange | undefined;
};

type BetContextType = {
  bets: Bet[];
  addBet: (bet: Omit<Bet, 'id'>) => void;
  filteredBets: Bet[];
  filters: BetFilters;
  setFilters: React.Dispatch<React.SetStateAction<BetFilters>>;
  calculateStats: () => {
    totalBets: number;
    totalStake: number;
    totalProfit: number;
    winRate: number;
    roi: number;
  };
};

const BetContext = createContext<BetContextType | undefined>(undefined);

export const BetProvider = ({ children }: { children: ReactNode }) => {
  const [bets, setBets] = useState<Bet[]>(() => {
    if (isServer) return INITIAL_BETS;
    try {
      const item = window.localStorage.getItem('betwise-bets');
      return item ? JSON.parse(item) : INITIAL_BETS;
    } catch (error) {
      console.error(error);
      return INITIAL_BETS;
    }
  });

  const [filters, setFilters] = useState<BetFilters>({
    sport: 'all',
    result: 'all',
    dateRange: undefined,
  });

  useEffect(() => {
    if (!isServer) {
      try {
        window.localStorage.setItem('betwise-bets', JSON.stringify(bets));
      } catch (error) {
        console.error(error);
      }
    }
  }, [bets]);

  const addBet = (bet: Omit<Bet, 'id'>) => {
    const newBet = { ...bet, id: new Date().getTime().toString() };
    setBets(prevBets => [newBet, ...prevBets]);
  };

  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      const betDate = new Date(bet.date);
      const { sport, result, dateRange } = filters;

      if (sport !== 'all' && bet.sport !== sport) return false;
      if (result !== 'all' && bet.result !== result) return false;
      if (dateRange?.from && betDate < dateRange.from) return false;
      if (dateRange?.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999); // Include the whole day
        if (betDate > toDate) return false;
      }
      return true;
    });
  }, [bets, filters]);

  const calculateStats = () => {
    const data = filteredBets.filter(b => b.result !== 'pending');
    const totalBets = data.length;
    const totalStake = data.reduce((acc, bet) => acc + bet.stake, 0);
    const wonBets = data.filter(b => b.result === 'won');
    const lostBets = data.filter(b => b.result === 'lost');
    
    const grossWinnings = wonBets.reduce((acc, bet) => acc + bet.stake * bet.odds, 0);
    const totalLost = lostBets.reduce((acc, bet) => acc + bet.stake, 0);
    
    const totalProfit = grossWinnings - (wonBets.reduce((acc, bet) => acc + bet.stake, 0) + totalLost);

    const winRate = totalBets > 0 ? (wonBets.length / totalBets) * 100 : 0;
    const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;

    return { totalBets, totalStake, totalProfit, winRate, roi };
  };

  return (
    <BetContext.Provider value={{ bets, addBet, filteredBets, filters, setFilters, calculateStats }}>
      {children}
    </BetContext.Provider>
  );
};

export const useBets = () => {
  const context = useContext(BetContext);
  if (context === undefined) {
    throw new Error('useBets must be used within a BetProvider');
  }
  return context;
};
