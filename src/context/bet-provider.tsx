'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Bet, Bookmaker } from '@/lib/types';
import { useAuth } from './auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';

interface BetContextType {
  bets: Bet[];
  bookmakers: Bookmaker[];
  isLoading: boolean;
  addBet: (bet: Omit<Bet, 'id'>) => Promise<void>;
  updateBet: (id: string, bet: Partial<Bet>) => Promise<void>;
  deleteBet: (id: string) => Promise<void>;
  addBookmaker: (bookmaker: Omit<Bookmaker, 'id'>) => Promise<void>;
  updateBookmaker: (id: string, bookmaker: Partial<Bookmaker>) => Promise<void>;
  deleteBookmaker: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const BetContext = createContext<BetContextType | undefined>(undefined);

interface BetProviderProps {
  children: ReactNode;
}

export function BetProvider({ children }: BetProviderProps) {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [bookmakers, setBookmakers] = useState<Bookmaker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    setIsLoading(true);
    try {
      const betsCollectionRef = collection(db, 'users', userId, 'bets');
      const bookmakersCollectionRef = collection(db, 'users', userId, 'bookmakers');

      const [betsSnapshot, bookmakersSnapshot] = await Promise.all([
        getDocs(betsCollectionRef),
        getDocs(bookmakersCollectionRef)
      ]);

      const betsData = betsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        } as Bet;
      });

      const bookmakersData = bookmakersSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Bookmaker[];

      setBets(betsData);
      setBookmakers(bookmakersData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      fetchUserData(user.uid);
    } else {
      setBets([]);
      setBookmakers([]);
      setIsLoading(false);
    }
  }, [user]);

  const addBet = async (betData: Omit<Bet, 'id'>) => {
    if (!user?.uid) return;

    try {
      const betsCollectionRef = collection(db, 'users', user.uid, 'bets');
      const docRef = await addDoc(betsCollectionRef, {
        ...betData,
        date: Timestamp.fromDate(betData.date),
      });

      const newBet = { ...betData, id: docRef.id };
      setBets(prev => [...prev, newBet]);
    } catch (error) {
      console.error('Error adding bet:', error);
      throw error;
    }
  };

  const updateBet = async (id: string, betData: Partial<Bet>) => {
    if (!user?.uid) return;

    try {
      const betDocRef = doc(db, 'users', user.uid, 'bets', id);
      const updateData = {
        ...betData,
        ...(betData.date && { date: Timestamp.fromDate(betData.date) }),
      };
      
      await setDoc(betDocRef, updateData, { merge: true });
      
      setBets(prev => prev.map(bet => 
        bet.id === id ? { ...bet, ...betData } : bet
      ));
    } catch (error) {
      console.error('Error updating bet:', error);
      throw error;
    }
  };

  const deleteBet = async (id: string) => {
    if (!user?.uid) return;

    try {
      const betDocRef = doc(db, 'users', user.uid, 'bets', id);
      await deleteDoc(betDocRef);
      
      setBets(prev => prev.filter(bet => bet.id !== id));
    } catch (error) {
      console.error('Error deleting bet:', error);
      throw error;
    }
  };

  const addBookmaker = async (bookmakerData: Omit<Bookmaker, 'id'>) => {
    if (!user?.uid) return;

    try {
      const bookmakersCollectionRef = collection(db, 'users', user.uid, 'bookmakers');
      const docRef = await addDoc(bookmakersCollectionRef, bookmakerData);

      const newBookmaker = { ...bookmakerData, id: docRef.id };
      setBookmakers(prev => [...prev, newBookmaker]);
    } catch (error) {
      console.error('Error adding bookmaker:', error);
      throw error;
    }
  };

  const updateBookmaker = async (id: string, bookmakerData: Partial<Bookmaker>) => {
    if (!user?.uid) return;

    try {
      const bookmakerDocRef = doc(db, 'users', user.uid, 'bookmakers', id);
      await setDoc(bookmakerDocRef, bookmakerData, { merge: true });
      
      setBookmakers(prev => prev.map(bookmaker => 
        bookmaker.id === id ? { ...bookmaker, ...bookmakerData } : bookmaker
      ));
    } catch (error) {
      console.error('Error updating bookmaker:', error);
      throw error;
    }
  };

  const deleteBookmaker = async (id: string) => {
    if (!user?.uid) return;

    try {
      const bookmakerDocRef = doc(db, 'users', user.uid, 'bookmakers', id);
      await deleteDoc(bookmakerDocRef);
      
      setBookmakers(prev => prev.filter(bookmaker => bookmaker.id !== id));
    } catch (error) {
      console.error('Error deleting bookmaker:', error);
      throw error;
    }
  };

  const refreshData = async () => {
    if (user?.uid) {
      await fetchUserData(user.uid);
    }
  };

  const value: BetContextType = {
    bets,
    bookmakers,
    isLoading,
    addBet,
    updateBet,
    deleteBet,
    addBookmaker,
    updateBookmaker,
    deleteBookmaker,
    refreshData,
  };

  return (
    <BetContext.Provider value={value}>
      {children}
    </BetContext.Provider>
  );
}

export function useBets() {
  const context = useContext(BetContext);
  if (context === undefined) {
    throw new Error('useBets must be used within a BetProvider');
  }
  return context;
}