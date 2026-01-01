
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Bet, Bookmaker as BookmakerType, FreeSpin } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, BarChart, AlertTriangle, Save, TrendingUp, TrendingDown, Calculator, Wallet, Landmark, Building, FileDown, Loader2, Calendar, Filter, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BetCard } from '@/components/bets/bet-card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { BetForm } from '@/components/bets/bet-form';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { BetPerformanceChart } from '@/components/bets/bet-performance-chart';
import { BetStatusChart } from '@/components/bets/bet-status-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { SurebetCalculator } from '@/components/bets/surebet-calculator';
import { AdvancedSurebetCalculator } from '@/components/bets/advanced-surebet-calculator';
import { TradingCalculator } from '@/components/bets/trading-calculator';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, isWithinInterval, format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, addDoc, Timestamp, writeBatch, deleteField } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookmakerCard } from '@/components/bookmakers/bookmaker-card';
import { BookmakerForm } from '@/components/bookmakers/bookmaker-form';
import * as XLSX from 'xlsx';


export default function BetsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    
    // States
    const [bets, setBets] = useState<Bet[]>([]);
    const [bookmakers, setBookmakers] = useState<BookmakerType[]>([]);
    const [freeSpins, setFreeSpins] = useState<FreeSpin[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    
    // Dialog/Modal states
    const [isBetFormOpen, setIsBetFormOpen] = useState(false);
    const [betToEdit, setBetToEdit] = useState<Bet | null>(null);
    const [betToDelete, setBetToDelete] = useState<Bet | null>(null);
    const [isBookmakerFormOpen, setIsBookmakerFormOpen] = useState(false);
    const [bookmakerToEdit, setBookmakerToEdit] = useState<BookmakerType | null>(null);
    const [bookmakerToDelete, setBookmakerToDelete] = useState<BookmakerType | null>(null);
    // Totais: override e diálogo
    const [isTotalsDialogOpen, setIsTotalsDialogOpen] = useState(false);
    const [totalsOverride, setTotalsOverride] = useState<{ initial?: number; current?: number } | null>(null);
    const [overrideInitial, setOverrideInitial] = useState<string>("");
    const [overrideCurrent, setOverrideCurrent] = useState<string>("");

    // Filter states
    const [filterStatus, setFilterStatus] = useState<string>("pending");
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [dayFilter, setDayFilter] = useState<number[]>([]); // 0=Dom, 6=Sáb
    const [customDateStart, setCustomDateStart] = useState<string>("");
    const [customDateEnd, setCustomDateEnd] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState<string>("");
    const [profitFilter, setProfitFilter] = useState<string>("all");
    const [minProfit, setMinProfit] = useState<string>("");
    const [maxProfit, setMaxProfit] = useState<string>("");
    
    const { toast } = useToast();

    // Data fetching
    const fetchUserData = useCallback(async (userId: string) => {
        setIsLoading(true);
        try {
            const betsCollectionRef = collection(db, 'users', userId, 'bets');
            const bookmakersCollectionRef = collection(db, 'users', userId, 'bookmakers');
            const freeSpinsCollectionRef = collection(db, 'users', userId, 'freeSpins');

            const [betsSnapshot, bookmakersSnapshot, freeSpinsSnapshot] = await Promise.all([
                getDocs(betsCollectionRef),
                getDocs(bookmakersCollectionRef),
                getDocs(freeSpinsCollectionRef),
            ]);

            const betsData = betsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
                } as Bet;
            });
            setBets(betsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            const bookmakersData = bookmakersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as BookmakerType);
            setBookmakers(bookmakersData);

            const freeSpinsData = freeSpinsSnapshot.docs.map(doc => {
                const data = doc.data() as any;
                return {
                    ...data,
                    id: doc.id,
                    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
                } as FreeSpin;
            });
            setFreeSpins(freeSpinsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

            // Carregar overrides de totais (configuração do dashboard)
            try {
                const settingsDocRef = doc(db, 'users', userId, 'settings', 'dashboard');
                const settingsSnap = await getDoc(settingsDocRef);
                if (settingsSnap.exists()) {
                    const data = settingsSnap.data() as any;
                    if (data?.totalsOverride) {
                        setTotalsOverride({
                            initial: typeof data.totalsOverride.initial === 'number' ? data.totalsOverride.initial : undefined,
                            current: typeof data.totalsOverride.current === 'number' ? data.totalsOverride.current : undefined,
                        });
                    }
                }
            } catch (e) {
                console.warn('Falha ao carregar configurações do dashboard.', e);
            }

        } catch (error) {
            console.error("Error fetching user data:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados',
                description: 'Não foi possível buscar seus dados do Firestore.'
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (user) {
            fetchUserData(user.uid);
        } else if (!authLoading) {
            setIsLoading(false);
            router.replace('/login');
        }
    }, [user, authLoading, fetchUserData, router]);
    
    // Memoized calculations
    const summaryStats = useMemo(() => {
        const totalInitialBankroll = bookmakers.reduce((acc, b) => acc + b.initialBankroll, 0);

        const betsProfit = bets.reduce((acc, bet) => {
            // Ignorar pendentes e anuladas; considerar cashout via realizedProfit
            if (bet.status === 'pending' || bet.status === 'void') return acc;

            // Se houver realizedProfit, sempre priorizar (cobre cashout e ajustes manuais)
            if (bet.realizedProfit !== null && bet.realizedProfit !== undefined) {
                return acc + bet.realizedProfit;
            }

            if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won') return acc + (stake * odds) - stake;
                if (bet.status === 'lost') return acc - stake;
                // cash out sem realizedProfit explícito não altera lucro
                return acc;
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                if (bet.status === 'won') {
                    const profitToUse = bet.guaranteedProfit ?? 0;
                    return acc + profitToUse;
                }
                if (bet.status === 'lost') return acc - (bet.totalStake ?? 0);
                // cash out sem realizedProfit explícito não altera lucro
                return acc;
            }
            return acc;
        }, 0);

        const freeSpinsProfit = freeSpins.reduce((acc, fs) => acc + (fs.wonAmount ?? 0), 0);
        const allTimeProfit = betsProfit + freeSpinsProfit;

        const currentBankroll = totalInitialBankroll + allTimeProfit;
        
        return {
            totalInitialBankroll,
            allTimeProfit,
            currentBankroll,
            totalBets: bets.length,
            winRate: bets.length > 0 ? (bets.filter(b => b.status === 'won').length / bets.filter(b => ['won', 'lost'].includes(b.status)).length) * 100 : 0
        }
    }, [bets, bookmakers, freeSpins]);

    const monthlyProfitSummary = useMemo(() => {
        const calcProfit = (bet: Bet) => {
            if (bet.status === 'pending' || bet.status === 'void') return 0;
            if (bet.realizedProfit !== null && bet.realizedProfit !== undefined) return bet.realizedProfit;
            if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won') return (stake * odds) - stake;
                if (bet.status === 'lost') return -stake;
                return 0;
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                if (bet.status === 'won') return (bet.guaranteedProfit ?? 0);
                if (bet.status === 'lost') {
                    const combinedPaidStake = bet.subBets
                        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                        : (bet.totalStake ?? 0);
                    return -combinedPaidStake;
                }
                return 0;
            }
            return 0;
        };

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const prevDate = new Date(currentYear, currentMonth - 1, 1);
        const prevYear = prevDate.getFullYear();
        const prevMonth = prevDate.getMonth();

        const currentMonthProfit = bets.reduce((sum, bet) => {
            const d = new Date(bet.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth
                ? sum + calcProfit(bet)
                : sum;
        }, 0);

        const prevMonthProfit = bets.reduce((sum, bet) => {
            const d = new Date(bet.date);
            return d.getFullYear() === prevYear && d.getMonth() === prevMonth
                ? sum + calcProfit(bet)
                : sum;
        }, 0);

        const fsCurrentMonthProfit = freeSpins.reduce((sum, fs) => {
            const d = new Date(fs.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth
                ? sum + (fs.wonAmount ?? 0)
                : sum;
        }, 0);

        const fsPrevMonthProfit = freeSpins.reduce((sum, fs) => {
            const d = new Date(fs.date);
            return d.getFullYear() === prevYear && d.getMonth() === prevMonth
                ? sum + (fs.wonAmount ?? 0)
                : sum;
        }, 0);

        const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const prevMonthLabel = `${monthNames[prevMonth]} ${prevYear}`;

        return { currentMonthProfit: currentMonthProfit + fsCurrentMonthProfit, prevMonthProfit: prevMonthProfit + fsPrevMonthProfit, prevMonthLabel };
    }, [bets, freeSpins]);

    // Valores exibidos com possíveis overrides
    const displayInitialTotal = totalsOverride?.initial ?? summaryStats.totalInitialBankroll;
    // Se houver override explícito para 'current', obedecer; caso contrário, somar lucro ao inicial exibido
    const displayCurrentTotal = (totalsOverride?.current ?? (displayInitialTotal + summaryStats.allTimeProfit));

    const openTotalsDialog = () => {
        setOverrideInitial(displayInitialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        setOverrideCurrent(displayCurrentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        setIsTotalsDialogOpen(true);
    };

    const formatCurrencyInput = (s: string) => {
        const digits = s.replace(/\D/g, '');
        if (!digits) return '';
        const n = Number(digits) / 100;
        return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Converte string em formatos BR/US para número
    const parseNumber = (s: string): number | undefined => {
        if (!s) return undefined;
        const raw = s.replace(/[^0-9.,]/g, '').trim();
        if (!raw) return undefined;
        const hasComma = raw.includes(',');
        const hasDot = raw.includes('.');
        if (hasComma) {
            const normalized = raw.replace(/\./g, '').replace(',', '.');
            const n = Number(normalized);
            return isNaN(n) ? undefined : n;
        }
        if (hasDot) {
            const n = Number(raw);
            return isNaN(n) ? undefined : n;
        }
        const digits = raw.replace(/\D/g, '');
        if (!digits) return undefined;
        const integerPart = digits.slice(0, Math.max(0, digits.length - 2)) || '0';
        const decimalPart = digits.slice(-2).padStart(2, '0');
        const n = Number(`${integerPart}.${decimalPart}`);
        return isNaN(n) ? undefined : n;
    };

    const handleSaveTotalsOverride = async () => {
        if (!user) { toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' }); return; }
        const initialNum = parseNumber(overrideInitial);
        const currentNum = parseNumber(overrideCurrent);
        const updateData: Record<string, any> = {};
        updateData['totalsOverride.initial'] = (initialNum !== undefined) ? initialNum : deleteField();
        updateData['totalsOverride.current'] = (currentNum !== undefined) ? currentNum : deleteField();
        try {
            const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'dashboard');
            await setDoc(settingsDocRef, updateData, { merge: true });
            if (initialNum === undefined && currentNum === undefined) {
                setTotalsOverride(null);
            } else {
                setTotalsOverride({
                    initial: initialNum,
                    current: currentNum,
                });
            }
            toast({ title: 'Totais atualizados', description: 'Os valores foram ajustados com sucesso.' });
            setIsTotalsDialogOpen(false);
        } catch (error) {
            console.error('Erro ao salvar overrides:', error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar os novos valores.' });
        }
    };

    const filteredBets = useMemo(() => {
        let filtered = bets;

        // Filter by status
        const otherStatuses: Bet['status'][] = ['cashed_out', 'void'];
        if (filterStatus !== 'all') {
            if (filterStatus === 'other') {
                filtered = filtered.filter(bet => otherStatuses.includes(bet.status));
            } else {
                filtered = filtered.filter(bet => bet.status === filterStatus);
            }
        }

        // Filter by date
        if (dateFilter !== 'all') {
            const now = new Date();
            let startDate: Date;
            let endDate: Date;

            switch (dateFilter) {
                case 'today':
                    startDate = startOfDay(now);
                    endDate = endOfDay(now);
                    break;
                case 'week':
                    startDate = startOfWeek(now);
                    endDate = endOfWeek(now);
                    break;
                case 'month':
                    startDate = startOfMonth(now);
                    endDate = endOfMonth(now);
                    break;
                case 'specific_month':
                    if (selectedMonth) {
                        const base = new Date(`${selectedMonth}-01T00:00:00`);
                        startDate = startOfMonth(base);
                        endDate = endOfMonth(base);
                    } else {
                        return filtered;
                    }
                    break;
                case 'custom':
                    if (customDateStart && customDateEnd) {
                        startDate = startOfDay(new Date(customDateStart));
                        endDate = endOfDay(new Date(customDateEnd));
                    } else {
                        return filtered; // Return without date filter if custom dates are not set
                    }
                    break;
                default:
                    return filtered;
            }

            filtered = filtered.filter(bet => {
                const betDate = new Date(bet.date);
                return isWithinInterval(betDate, { start: startDate, end: endDate });
            });
        }

        // Filter by day of week (multi-select): if none selected, keep all
        if (dayFilter.length > 0) {
            filtered = filtered.filter(bet => {
                const d = new Date(bet.date).getDay(); // 0=Dom
                return dayFilter.includes(d);
            });
        }

        // Filter by profit
        if (profitFilter !== 'all') {
            filtered = filtered.filter(bet => {
                let profit: number = 0;

                if (bet.realizedProfit != null) {
                    profit = bet.realizedProfit;
                } else if (bet.status === 'won') {
                    if (bet.type === 'single') {
                        const stake = bet.stake ?? 0;
                        const odds = bet.odds ?? 0;
                        profit = (stake * odds) - stake;
                    } else {
                        profit = bet.guaranteedProfit ?? 0;
                    }
                } else if (bet.status === 'lost') {
                    if (bet.type === 'single') {
                        profit = -(bet.stake ?? 0);
                    } else {
                        profit = -(bet.totalStake ?? 0);
                    }
                }

                switch (profitFilter) {
                    case 'positive':
                        return profit > 0;
                    case 'negative':
                        return profit < 0;
                    case 'range':
                        const min = minProfit ? parseFloat(minProfit) : -Infinity;
                        const max = maxProfit ? parseFloat(maxProfit) : Infinity;
                        return profit >= min && profit <= max;
                    default:
                        return true;
                }
            });
        }

        return filtered;
    }, [bets, filterStatus, dateFilter, customDateStart, customDateEnd, profitFilter, minProfit, maxProfit, dayFilter]);

    // Filtered statistics
    const filteredStats = useMemo(() => {
        const filteredProfit = filteredBets.reduce((acc, bet) => {
            if (bet.status === 'pending' || bet.status === 'void') return acc;

            if (bet.realizedProfit !== null && bet.realizedProfit !== undefined) {
                return acc + bet.realizedProfit;
            }

            if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won') return acc + (stake * odds) - stake;
                if (bet.status === 'lost') return acc - stake;
                return acc; // cash out sem realizedProfit
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                if (bet.status === 'won') {
                    const profitToUse = bet.guaranteedProfit ?? 0;
                    return acc + profitToUse;
                }
                if (bet.status === 'lost') return acc - (bet.totalStake ?? 0);
                return acc; // cash out sem realizedProfit
            }
            return acc;
        }, 0);

        // Total apostado no período filtrado (somando stakes de singles e surebets)
        const totalStaked = filteredBets.reduce((sum, bet) => {
            if (bet.type === 'single') {
                return sum + (bet.stake ?? 0);
            }
            if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                return sum + combinedPaidStake;
            }
            return sum;
        }, 0);

        // Possível ganho do período (lucro potencial):
        // - Se houver realizedProfit, usa-se este valor
        // - Se 'won', calcula lucro realizado
        // - Se 'lost' ou 'void', 0
        // - Se 'pending', calcula lucro potencial: single => stake*(odds-1);
        //   surebet => max( sub.stake*sub.odds - totalStake )
        const potentialGain = filteredBets.reduce((sum, bet) => {
            if (bet.realizedProfit !== null && bet.realizedProfit !== undefined) {
                return sum + bet.realizedProfit;
            }

            if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won') {
                    return sum + (stake * odds) - stake;
                }
                if (bet.status === 'lost' || bet.status === 'void') {
                    return sum;
                }
                // pending/cashed_out sem realizedProfit: lucro potencial teórico
                return sum + Math.max(stake * (odds - 1), 0);
            }

            if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                if (bet.status === 'won') {
                    const profitToUse = bet.guaranteedProfit ?? 0;
                    return sum + profitToUse;
                }
                if (bet.status === 'lost' || bet.status === 'void') {
                    return sum;
                }
                // pending/cashed_out sem realizedProfit: lucro potencial máximo entre os desfechos
                const maxOutcomeProfit = (bet.subBets ?? []).reduce((maxP, sb) => {
                    const stake = sb.stake ?? 0;
                    const odds = sb.odds ?? 0;
                    const payoutMinusCosts = sb.isFreebet ? (stake * (odds - 1)) - combinedPaidStake : (stake * odds) - combinedPaidStake;
                    return Math.max(maxP, payoutMinusCosts);
                }, 0);
                return sum + Math.max(maxOutcomeProfit, 0);
            }
            return sum;
        }, 0);

        // Retorno potencial (payout total creditado):
        const potentialPayout = filteredBets.reduce((sum, bet) => {
            if (bet.realizedProfit !== null && bet.realizedProfit !== undefined) {
                // sem perder fidelidade: payout ≈ lucro + custo
                if (bet.type === 'single') {
                    const stake = bet.stake ?? 0;
                    return sum + (bet.realizedProfit + stake);
                }
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                return sum + (bet.realizedProfit + combinedPaidStake);
            }

            if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won' || bet.status === 'pending' || bet.status === 'cashed_out') {
                    return sum + (stake * odds);
                }
                return sum;
            }

            if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                if (bet.status === 'won') {
                    const profitToUse = bet.guaranteedProfit ?? 0;
                    return sum + (profitToUse + combinedPaidStake);
                }
                if (bet.status === 'lost' || bet.status === 'void') {
                    return sum;
                }
                // pending: melhor retorno potencial (apenas crédito da perna vencedora)
                const maxOutcomeReturn = (bet.subBets ?? []).reduce((maxR, sb) => {
                    const stake = sb.stake ?? 0;
                    const odds = sb.odds ?? 0;
                    const credited = sb.isFreebet ? (stake * (odds - 1)) : (stake * odds);
                    return Math.max(maxR, credited);
                }, 0);
                return sum + Math.max(maxOutcomeReturn, 0);
            }
            return sum;
        }, 0);

        const filteredWinRate = filteredBets.length > 0 ? 
            (filteredBets.filter(b => b.status === 'won').length / filteredBets.filter(b => ['won', 'lost'].includes(b.status)).length) * 100 : 0;

        const lossAmount = filteredBets.reduce((sum, bet) => {
            if (bet.status !== 'lost') return sum;
            if (bet.type === 'single') return sum + (bet.stake ?? 0);
            if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                return sum + combinedPaidStake;
            }
            return sum;
        }, 0);

        const finalBalance = potentialPayout - totalStaked;

        return {
            totalBets: filteredBets.length,
            profit: filteredProfit,
            winRate: filteredWinRate,
            wonBets: filteredBets.filter(b => b.status === 'won').length,
            lostBets: filteredBets.filter(b => b.status === 'lost').length,
            pendingBets: filteredBets.filter(b => b.status === 'pending').length,
            totalStaked,
            potentialGain,
            potentialPayout,
            lossAmount,
            finalBalance
        };
    }, [filteredBets]);

    // Daily breakdown (apostas por dia)
    const dailyStats = useMemo(() => {
        const labels = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const byDay = Array.from({ length: 7 }, (_, i) => ({
            day: i,
            label: labels[i],
            totalStaked: 0,
            potentialGain: 0,
            potentialPayout: 0,
            lossAmount: 0,
            finalBalance: 0,
            count: 0,
        }));

        for (const bet of filteredBets) {
            const idx = new Date(bet.date).getDay();
            const bucket = byDay[idx];

            // staked
            if (bet.type === 'single') {
                bucket.totalStaked += (bet.stake ?? 0);
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                bucket.totalStaked += combinedPaidStake;
            }

            // potential gain
            if (bet.realizedProfit != null) {
                bucket.potentialGain += bet.realizedProfit;
            } else if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won') bucket.potentialGain += (stake * odds) - stake;
                else if (bet.status === 'lost' || bet.status === 'void') {}
                else bucket.potentialGain += Math.max(stake * (odds - 1), 0);
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                if (bet.status === 'won') bucket.potentialGain += (bet.guaranteedProfit ?? 0);
                else if (bet.status === 'lost' || bet.status === 'void') {}
                else {
                    const maxOutcomeProfit = (bet.subBets ?? []).reduce((maxP, sb) => {
                        const stake = sb.stake ?? 0;
                        const odds = sb.odds ?? 0;
                        const profit = sb.isFreebet ? (stake * (odds - 1)) - combinedPaidStake : (stake * odds) - combinedPaidStake;
                        return Math.max(maxP, profit);
                    }, 0);
                    bucket.potentialGain += Math.max(maxOutcomeProfit, 0);
                }
            }

            if (bet.status === 'lost') {
                if (bet.type === 'single') {
                    bucket.lossAmount += (bet.stake ?? 0);
                } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                    const combinedPaidStake = bet.subBets
                        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                        : (bet.totalStake ?? 0);
                    bucket.lossAmount += combinedPaidStake;
                }
            }

            // potential payout
            if (bet.realizedProfit != null) {
                if (bet.type === 'single') {
                    const stake = bet.stake ?? 0;
                    bucket.potentialPayout += bet.realizedProfit + stake;
                } else {
                    const combinedPaidStake = bet.subBets
                        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                        : (bet.totalStake ?? 0);
                    bucket.potentialPayout += bet.realizedProfit + combinedPaidStake;
                }
            } else if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won' || bet.status === 'pending' || bet.status === 'cashed_out') bucket.potentialPayout += stake * odds;
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                if (bet.status === 'won') {
                    const combinedPaidStake = bet.subBets
                        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                        : (bet.totalStake ?? 0);
                    bucket.potentialPayout += (bet.guaranteedProfit ?? 0) + combinedPaidStake;
                } else if (bet.status === 'pending' || bet.status === 'cashed_out') {
                    const maxOutcomeReturn = (bet.subBets ?? []).reduce((maxR, sb) => {
                        const stake = sb.stake ?? 0;
                        const odds = sb.odds ?? 0;
                        const credited = sb.isFreebet ? (stake * (odds - 1)) : (stake * odds);
                        return Math.max(maxR, credited);
                    }, 0);
                    bucket.potentialPayout += Math.max(maxOutcomeReturn, 0);
                }
            }

            bucket.count += 1;
        }

        for (const d of byDay) {
            d.finalBalance = d.potentialPayout - d.totalStaked;
        }

        const daysToShow = (dayFilter.length > 0 ? dayFilter : byDay.map(d => d.day))
            .filter(d => byDay[d].count > 0);
        return byDay.filter(d => daysToShow.includes(d.day));
    }, [filteredBets, dayFilter]);

    const monthlyStats = useMemo(() => {
        const byMonth: Record<string, {
            key: string;
            year: number;
            month: number;
            label: string;
            totalStaked: number;
            potentialGain: number;
            potentialPayout: number;
            lossAmount: number;
            finalBalance: number;
            count: number;
            isCurrent: boolean;
        }> = {};

        const now = new Date();
        const currentKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        const makeLabel = (y: number, m: number) => {
            const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            return `${names[m]} ${y}`;
        };

        for (const bet of filteredBets) {
            const d = new Date(bet.date);
            const y = d.getFullYear();
            const m = d.getMonth();
            const key = `${y}-${String(m+1).padStart(2,'0')}`;

            if (!byMonth[key]) {
                byMonth[key] = {
                    key,
                    year: y,
                    month: m,
                    label: makeLabel(y, m),
                    totalStaked: 0,
                    potentialGain: 0,
                    potentialPayout: 0,
                    lossAmount: 0,
                    finalBalance: 0,
                    count: 0,
                    isCurrent: key === currentKey,
                };
            }

            const bucket = byMonth[key];

            // staked
            if (bet.type === 'single') {
                bucket.totalStaked += (bet.stake ?? 0);
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                bucket.totalStaked += combinedPaidStake;
            }

            // potential gain
            if (bet.realizedProfit != null) {
                bucket.potentialGain += bet.realizedProfit;
            } else if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won') bucket.potentialGain += (stake * odds) - stake;
                else if (bet.status === 'lost' || bet.status === 'void') {}
                else bucket.potentialGain += Math.max(stake * (odds - 1), 0);
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                const combinedPaidStake = bet.subBets
                    ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                    : (bet.totalStake ?? 0);
                if (bet.status === 'won') bucket.potentialGain += (bet.guaranteedProfit ?? 0);
                else if (bet.status === 'lost' || bet.status === 'void') {}
                else {
                    const maxOutcomeProfit = (bet.subBets ?? []).reduce((maxP, sb) => {
                        const stake = sb.stake ?? 0;
                        const odds = sb.odds ?? 0;
                        const profit = sb.isFreebet ? (stake * (odds - 1)) - combinedPaidStake : (stake * odds) - combinedPaidStake;
                        return Math.max(maxP, profit);
                    }, 0);
                    bucket.potentialGain += Math.max(maxOutcomeProfit, 0);
                }
            }

            if (bet.status === 'lost') {
                if (bet.type === 'single') {
                    bucket.lossAmount += (bet.stake ?? 0);
                } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                    const combinedPaidStake = bet.subBets
                        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                        : (bet.totalStake ?? 0);
                    bucket.lossAmount += combinedPaidStake;
                }
            }

            // potential payout
            if (bet.realizedProfit != null) {
                if (bet.type === 'single') {
                    const stake = bet.stake ?? 0;
                    bucket.potentialPayout += bet.realizedProfit + stake;
                } else {
                    const combinedPaidStake = bet.subBets
                        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                        : (bet.totalStake ?? 0);
                    bucket.potentialPayout += bet.realizedProfit + combinedPaidStake;
                }
            } else if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won' || bet.status === 'pending' || bet.status === 'cashed_out') bucket.potentialPayout += stake * odds;
            } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                if (bet.status === 'won') {
                    const combinedPaidStake = bet.subBets
                        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
                        : (bet.totalStake ?? 0);
                    bucket.potentialPayout += (bet.guaranteedProfit ?? 0) + combinedPaidStake;
                } else if (bet.status === 'pending' || bet.status === 'cashed_out') {
                    const maxOutcomeReturn = (bet.subBets ?? []).reduce((maxR, sb) => {
                        const stake = sb.stake ?? 0;
                        const odds = sb.odds ?? 0;
                        const credited = sb.isFreebet ? (stake * (odds - 1)) : (stake * odds);
                        return Math.max(maxR, credited);
                    }, 0);
                    bucket.potentialPayout += Math.max(maxOutcomeReturn, 0);
                }
            }

            bucket.count += 1;
        }

        const items = Object.values(byMonth).map(b => ({
            ...b,
            finalBalance: b.potentialPayout - b.totalStaked,
        }));

        return items.sort((a, b) => (b.year - a.year) || (b.month - a.month));
    }, [filteredBets]);
    
    // CRUD Handlers for Bets
    const handleOpenBetForm = (bet: Bet | null = null) => {
        setBetToEdit(bet);
        setIsBetFormOpen(true);
    }

    const handleSaveBet = async (betData: Omit<Bet, 'id'>) => {
         if (!user) { toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' }); return; }
        const isEditing = !!betToEdit;
        const betToSave = { ...betData, date: Timestamp.fromDate(new Date(betData.date)) };
        const betsCollectionRef = collection(db, 'users', user.uid, 'bets');

        try {
            if (isEditing) {
                const betDocRef = doc(betsCollectionRef, betToEdit.id);
                await setDoc(betDocRef, betToSave);
                // @ts-ignore
                setBets(bets.map(b => (b.id === betToEdit.id ? { ...betToSave, id: b.id, date: new Date(betData.date) } as Bet : b)));
                toast({ title: "Aposta Atualizada!", description: `A aposta no evento "${betData.event}" foi atualizada.` });
            } else {
                const newDocRef = await addDoc(betsCollectionRef, betToSave);
                setBets(prev => [{...betData, id: newDocRef.id } as Bet, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                toast({ title: "Aposta Adicionada!", description: `Sua aposta em "${betData.event}" foi registrada.` });
            }
        } catch (error) {
            console.error("Error saving bet:", error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a aposta no banco de dados.' });
        } finally {
            setIsBetFormOpen(false);
            setBetToEdit(null);
        }
    };

    const handleDeleteBet = async (betId: string) => {
        if (!user) { toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' }); return; }
        const bet = bets.find(b => b.id === betId);
        if (!bet) return;
        
        try {
            await deleteDoc(doc(db, "users", user.uid, "bets", betId));
            setBets(bets.filter(b => b.id !== betId));
            setBetToDelete(null);
            toast({ variant: 'destructive', title: "Aposta Excluída!", description: `A aposta em "${bet.event}" foi removida.` });
        } catch (error) {
             console.error("Error deleting bet:", error);
             toast({ variant: 'destructive', title: 'Erro ao excluir', description: 'Não foi possível remover a aposta do banco de dados.' });
        }
    }
    
    // CRUD Handlers for Bookmakers
    const handleOpenBookmakerForm = (bookmaker: BookmakerType | null = null) => {
        setBookmakerToEdit(bookmaker);
        setIsBookmakerFormOpen(true);
    };

    const handleSaveBookmaker = async (bookmakerData: Omit<BookmakerType, 'id'>) => {
        if (!user) { toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' }); return; }
        const isEditing = !!bookmakerToEdit;
        const bookmakersCollectionRef = collection(db, 'users', user.uid, 'bookmakers');

        try {
            if (isEditing) {
                const bookmakerDocRef = doc(bookmakersCollectionRef, bookmakerToEdit.id);
                await setDoc(bookmakerDocRef, bookmakerData, { merge: true });
                setBookmakers(bks => bks.map(b => b.id === bookmakerToEdit.id ? { ...bookmakerData, id: b.id } : b));
                toast({ title: "Casa Atualizada!", description: `Os dados de "${bookmakerData.name}" foram atualizados.` });
            } else {
                const newDocRef = await addDoc(bookmakersCollectionRef, bookmakerData);
                setBookmakers(bks => [...bks, { ...bookmakerData, id: newDocRef.id }]);
                toast({ title: "Casa Adicionada!", description: `A casa "${bookmakerData.name}" foi registrada.` });
            }
        } catch (error) {
            console.error("Error saving bookmaker:", error);
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar a casa de apostas.' });
        } finally {
            setIsBookmakerFormOpen(false);
            setBookmakerToEdit(null);
        }
    };

    const handleDeleteBookmaker = async (bookmakerId: string) => {
         if (!user) { toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' }); return; }
        const bookmaker = bookmakers.find(b => b.id === bookmakerId);
        if (!bookmaker) return;
        
        // Find bets associated with this bookmaker
        const associatedBets = bets.filter(bet => {
            if(bet.type === 'single') return bet.bookmaker === bookmaker.name;
            if(bet.type === 'surebet' || bet.type === 'pa_surebet') return bet.subBets?.some(sb => sb.bookmaker === bookmaker.name);
            return false;
        });
        
        // Só bloquear se houver apostas PENDENTES associadas a esta casa
        const hasPendingAssociatedBets = associatedBets.some(b => b.status === 'pending');
        if (hasPendingAssociatedBets) {
            toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Não é possível excluir uma casa que possui apostas pendentes.' });
            setBookmakerToDelete(null);
            return;
        }

        try {
            await deleteDoc(doc(db, "users", user.uid, "bookmakers", bookmakerId));
            setBookmakers(bks => bks.filter(b => b.id !== bookmakerId));
            toast({ variant: 'destructive', title: "Casa Excluída!", description: `A casa "${bookmaker.name}" foi removida.` });
        } catch (error) {
             console.error("Error deleting bookmaker:", error);
             toast({ variant: 'destructive', title: 'Erro ao excluir', description: 'Não foi possível remover a casa do banco de dados.' });
        } finally {
            setBookmakerToDelete(null);
        }
    };
    
    // Export handler
    const handleExport = () => {
        setIsExporting(true);
        try {
            // 1. Prepare Bets Data
            const betsExportData = bets.map(bet => {
                let profit = null;
                if (bet.status === 'won' || bet.status === 'lost') {
                    if (bet.type === 'single') {
                        const stake = bet.stake ?? 0;
                        const odds = bet.odds ?? 0;
                        profit = bet.status === 'won' ? (stake * odds) - stake : -stake;
                    } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                        profit = bet.guaranteedProfit ?? 0;
                    }
                }

                return {
                    'Data': new Date(bet.date).toLocaleDateString('pt-BR'),
                    'Esporte': bet.sport,
                    'Evento': bet.event,
                    'Tipo': bet.type === 'single' ? 'Simples' : (bet.type === 'surebet' ? 'Surebet' : 'P.A. Surebet'),
                    'Seleção/Mercado': bet.type === 'single' ? bet.betType : bet.subBets?.map(sb => `${sb.bookmaker}: ${sb.betType}`).join(' | '),
                    'Casa(s)': bet.type === 'single' ? bet.bookmaker : bet.subBets?.map(sb => sb.bookmaker).join(', '),
                    'Stake Total': bet.type === 'single' ? bet.stake : bet.totalStake,
                    'Odds Média': bet.type === 'single' ? bet.odds : '',
                    'Status': bet.status,
                    'Lucro/Prejuízo': profit,
                    'Notas': bet.notes,
                };
            });

            // 2. Prepare Bookmakers Data
            const bookmakersExportData = bookmakers.map(bk => {
                // Calculate bookmaker stats directly
                const relevantBets = bets.filter(bet => {
                    if (bet.type === 'single') return bet.bookmaker === bk.name;
                    if (bet.type === 'surebet') return bet.subBets?.some(sb => sb.bookmaker === bk.name);
                    return false;
                }).filter(bet => ['won', 'lost'].includes(bet.status));

                const profit = relevantBets.reduce((acc, bet) => {
                    let subProfit = 0;
                    if (bet.type === 'single') {
                         if (bet.status === 'won') subProfit = (bet.stake! * bet.odds! - bet.stake!);
                         if (bet.status === 'lost') subProfit = -bet.stake!;
                    } else if (bet.type === 'surebet') {
                        const subBet = bet.subBets?.find(sb => sb.bookmaker === bk.name);
                        if (!subBet) return acc;
                        
                        if (bet.status === 'won') {
                            // Find which bet won
                            const winningBet = bet.subBets?.find(sb => (sb.stake * sb.odds - (bet.totalStake ?? 0)) > 0);
                            if (winningBet?.bookmaker === bk.name) {
                                subProfit = winningBet.isFreebet ? (winningBet.stake * (winningBet.odds -1)) : (winningBet.stake * winningBet.odds);
                            } else if(winningBet) {
                                subProfit = 0;
                            }
                        }
                        
                        // Subtract all stakes made at this bookmaker, as they are costs
                        const totalStakedAtHouse = bet.subBets?.filter(sb => sb.bookmaker === bk.name).reduce((sum, s) => sum + s.stake, 0) ?? 0;
                        subProfit -= totalStakedAtHouse;
                    }
                    return acc + subProfit;
                }, 0);

                const currentBalance = bk.initialBankroll + profit;

                return {
                    'Casa de Apostas': bk.name,
                    'Banca Inicial': bk.initialBankroll,
                    'Lucro/Prejuízo na Casa': profit,
                    'Saldo Atual': currentBalance,
                };
            });

            // 3. Create Worksheets
            const wb = XLSX.utils.book_new();
            const wsBets = XLSX.utils.json_to_sheet(betsExportData);
            const wsBookmakers = XLSX.utils.json_to_sheet(bookmakersExportData);

            XLSX.utils.book_append_sheet(wb, wsBets, 'Apostas');
            XLSX.utils.book_append_sheet(wb, wsBookmakers, 'Resumo das Bancas');

            // 4. Download the file
            XLSX.writeFile(wb, `BetWise_Dashboard_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

            toast({ title: "Exportação Concluída!", description: "Seu arquivo Excel foi baixado." });
        } catch (error) {
            console.error("Error exporting data:", error);
            toast({ variant: 'destructive', title: 'Erro na Exportação', description: 'Não foi possível gerar o arquivo.' });
        } finally {
            setIsExporting(false);
        }
    };


    // Render logic
    if (authLoading || isLoading) {
         return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="space-y-4 w-1/2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-8 w-1/2" />
                </div>
            </div>
         )
    }

    if (!user) {
        return (
          <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center p-4">
            <Card className="w-full max-w-lg text-center p-8">
                <CardHeader>
                    <AlertTriangle className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="mt-6 text-2xl font-bold">Acesso Restrito</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mt-2 text-muted-foreground">
                        Você precisa estar autenticado para acessar o painel.
                    </p>
                </CardContent>
            </Card>
          </div>
        );
    }


    const renderBetList = () => {
        if (filteredBets.length > 0) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredBets.map(bet => (
                        <BetCard 
                            key={bet.id} 
                            bet={bet} 
                            onEdit={() => handleOpenBetForm(bet)}
                            onDelete={() => setBetToDelete(bet)}
                        />
                    ))}
                 </div>
            )
        }
        
        return (
            <div className="text-center py-20 bg-muted rounded-lg col-span-full">
                <h3 className="text-2xl font-bold">Nenhuma Aposta Encontrada</h3>
                <p className="text-muted-foreground mt-2 mb-6">Não há apostas com este status. Adicione uma nova aposta ou mude o filtro.</p>
                <Button size="lg" onClick={() => handleOpenBetForm()}>
                    <PlusCircle className="mr-2"/>
                    Adicionar Aposta
                </Button>
            </div>
        )
    }

    return (
        <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-bold mb-1 flex items-center gap-2">
                        <BarChart className="w-8 h-8 text-primary" />
                        Painel de Controle
                    </h2>
                    <p className="text-muted-foreground">
                        Gerencie suas apostas, analise riscos e acompanhe seus resultados.
                    </p>
                </div>
                <div className='flex items-center gap-4'>
                     <Button size="lg" onClick={handleExport} variant="outline" disabled={isExporting} className="w-full md:w-auto">
                        {isExporting ? <Loader2 className="animate-spin mr-2" /> : <FileDown className="mr-2"/>}
                        {isExporting ? 'Exportando...' : 'Exportar para Excel'}
                    </Button>
                    <Button size="lg" onClick={() => handleOpenBetForm()} className="w-full md:w-auto">
                        <PlusCircle className="mr-2"/>
                        Adicionar Aposta
                    </Button>
                </div>
            </div>
            
             <div className="mb-8">
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                     <h3 className="text-2xl font-bold flex items-center gap-2">
                        <Wallet className="w-7 h-7 text-primary" />
                        Resumo Geral
                     </h3>
                     <Button variant="outline" size="sm" onClick={openTotalsDialog}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar Totais
                     </Button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard title="Banca Inicial Total" value={displayInitialTotal} icon={Landmark} isCurrency />
                    <SummaryCard title="Banca Atual Total" value={displayCurrentTotal} icon={Wallet} isCurrency />
                    <SummaryCard title="Lucro do Mês Atual" value={monthlyProfitSummary.currentMonthProfit} icon={monthlyProfitSummary.currentMonthProfit >= 0 ? TrendingUp : TrendingDown} isCurrency valueClassName={monthlyProfitSummary.currentMonthProfit >= 0 ? "text-green-500" : "text-destructive"} />
                    <SummaryCard title={`Lucro/Prejuízo Mês Anterior (${monthlyProfitSummary.prevMonthLabel})`} value={monthlyProfitSummary.prevMonthProfit} icon={monthlyProfitSummary.prevMonthProfit >= 0 ? TrendingUp : TrendingDown} isCurrency valueClassName={monthlyProfitSummary.prevMonthProfit >= 0 ? "text-green-500" : "text-destructive"} />
                    <SummaryCard title="Total de Apostas" value={bets.length} icon={Landmark} />
                </div>
            </div>

             <div className="mb-8">
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                     <h3 className="text-2xl font-bold flex items-center gap-2">
                        <Building className="w-7 h-7 text-primary" />
                        Bancas por Casa
                     </h3>
                      <Button onClick={() => handleOpenBookmakerForm()} variant="outline">
                        <PlusCircle className="mr-2"/> Adicionar Casa
                    </Button>
                </div>
                {bookmakers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {bookmakers.map(bk => (
                             <BookmakerCard 
                                key={bk.id} 
                                bookmaker={bk}
                                bets={bets}
                                freeSpins={freeSpins}
                                onEdit={() => handleOpenBookmakerForm(bk)}
                                onDelete={() => setBookmakerToDelete(bk)}
                            />
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-10 bg-muted rounded-lg col-span-full">
                        <h3 className="text-xl font-bold">Nenhuma Casa de Apostas Cadastrada</h3>
                        <p className="text-muted-foreground mt-2 mb-6">Adicione uma casa para começar a gerenciar suas bancas separadamente.</p>
                        <Button onClick={() => handleOpenBookmakerForm()}>
                            <PlusCircle className="mr-2"/>
                            Adicionar Casa de Apostas
                        </Button>
                    </div>
                )}
            </div>

            <div className="mb-8">
                 <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Calculator className="w-7 h-7 text-primary" />
                    Calculadoras
                 </h3>
                 <AdvancedSurebetCalculator />
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                <div className="lg:col-span-3 h-[240px] md:h-[360px]">
                    <BetPerformanceChart data={bets} isLoading={isLoading}/>
                </div>
                <div className="lg:col-span-2 h-[240px] md:h-[360px]">
                    <BetStatusChart data={bets} isLoading={isLoading}/>
                </div>
             </div>
             
             {/* Filtered Statistics */}
            {(dateFilter !== 'all' || profitFilter !== 'all' || dayFilter.length > 0) && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <BarChart className="h-5 w-5" />
                        Estatísticas do Período Filtrado
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <SummaryCard
                            title="Total de Apostas"
                            value={filteredStats.totalBets}
                            icon={Calculator}
                        />
                        <SummaryCard
                            title="Lucro do Período"
                            value={filteredStats.profit}
                            icon={filteredStats.profit >= 0 ? TrendingUp : TrendingDown}
                            isCurrency
                            valueClassName={filteredStats.profit >= 0 ? "text-green-500" : "text-destructive"}
                        />
                        <SummaryCard
                            title="Taxa de Acerto"
                            value={filteredStats.winRate}
                            icon={BarChart}
                            isPercentage
                            valueClassName={filteredStats.winRate >= 50 ? "text-green-500" : "text-destructive"}
                        />
                        <SummaryCard
                            title="Ganhas/Perdidas"
                            value={`${filteredStats.wonBets}/${filteredStats.lostBets}`}
                            icon={Calculator}
                        />
                        <SummaryCard
                            title="Perdas"
                            value={filteredStats.lossAmount}
                            icon={TrendingDown}
                            isCurrency
                            valueClassName={filteredStats.lossAmount > 0 ? "text-destructive" : ""}
                        />
                        <SummaryCard
                            title="Valor Apostado"
                            value={filteredStats.totalStaked}
                            icon={Wallet}
                            isCurrency
                        />
                        <SummaryCard
                            title="Possível Ganho"
                            value={filteredStats.potentialGain}
                            icon={TrendingUp}
                            isCurrency
                            valueClassName={filteredStats.potentialGain >= 0 ? "text-green-500" : "text-destructive"}
                        />
                        <SummaryCard
                            title="Retorno Potencial"
                            value={filteredStats.potentialPayout}
                            icon={Wallet}
                            isCurrency
                            valueClassName={filteredStats.potentialPayout >= 0 ? "text-green-500" : "text-destructive"}
                        />
                        <SummaryCard
                            title="Saldo Final (Despesas x Ganhos)"
                            value={filteredStats.finalBalance}
                            icon={Calculator}
                            isCurrency
                            valueClassName={filteredStats.finalBalance >= 0 ? "text-green-500" : "text-destructive"}
                        />
                    </div>
                </div>
             )}

            {/* Daily Breakdown Cards */}
            {(dateFilter !== 'all' || profitFilter !== 'all' || dayFilter.length > 0) && dailyStats.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Resumo por Dia
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dailyStats.map(d => (
                            <Card key={d.day}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">{d.label}</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Apostado</div>
                                            <div className="text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.totalStaked)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Possível Ganho</div>
                                            <div className={`text-sm font-semibold ${d.potentialGain >= 0 ? 'text-green-500' : 'text-destructive'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.potentialGain)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-xs text-muted-foreground">Retorno Potencial</div>
                                        <div className={`text-sm font-semibold ${d.potentialPayout >= 0 ? 'text-green-500' : 'text-destructive'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.potentialPayout)}</div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-xs text-muted-foreground">Perdas</div>
                                        <div className="text-destructive text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.lossAmount)}</div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-xs text-muted-foreground">Saldo Final</div>
                                        <div className={`text-sm font-semibold ${d.finalBalance >= 0 ? 'text-green-500' : 'text-destructive'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.finalBalance)}</div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Monthly Breakdown Cards */}
            {monthlyStats.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Resumo por Mês
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {monthlyStats.map(m => (
                            <Card key={m.key}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>{m.label}</span>
                                        {m.isCurrent && <span className="text-xs text-muted-foreground">em andamento</span>}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Apostado</div>
                                            <div className="text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.totalStaked)}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Perdas</div>
                                            <div className="text-sm font-semibold text-destructive">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.lossAmount)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="text-xs text-muted-foreground">Saldo Final</div>
                                        <div className={`text-sm font-semibold ${m.finalBalance >= 0 ? 'text-green-500' : 'text-destructive'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.finalBalance)}</div>
                                    </div>
                                    <div className="mt-2 text-xs text-muted-foreground">Apostas no mês: {m.count}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

             {/* Filters Section */}
             <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    {/* Date Filter */}
                    <div className="space-y-2">
                        <Label htmlFor="date-filter" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Filtro por Data
                        </Label>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as datas</SelectItem>
                                <SelectItem value="today">Hoje</SelectItem>
                                <SelectItem value="week">Esta semana</SelectItem>
                                <SelectItem value="month">Este mês</SelectItem>
                                <SelectItem value="specific_month">Mês específico</SelectItem>
                                <SelectItem value="custom">Período personalizado</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        {dateFilter === 'specific_month' && (
                            <div className="mt-2">
                                <Label htmlFor="month-select" className="text-xs">Selecione o mês</Label>
                                <Input
                                    id="month-select"
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            </div>
                        )}
                        {dateFilter === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <Label htmlFor="start-date" className="text-xs">Data inicial</Label>
                                    <Input
                                        id="start-date"
                                        type="date"
                                        value={customDateStart}
                                        onChange={(e) => setCustomDateStart(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="end-date" className="text-xs">Data final</Label>
                                    <Input
                                        id="end-date"
                                        type="date"
                                        value={customDateEnd}
                                        onChange={(e) => setCustomDateEnd(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Day of Week Filter */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            Dias da Semana
                        </Label>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((label, idx) => (
                                <div key={label} className="flex items-center gap-1">
                                    <Checkbox
                                        checked={dayFilter.includes(idx)}
                                        onCheckedChange={(checked) => {
                                            setDayFilter(prev => {
                                                const isChecked = !!checked;
                                                if (isChecked) return [...prev, idx];
                                                return prev.filter(d => d !== idx);
                                            });
                                        }}
                                    />
                                    <span className="text-xs">{label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" onClick={() => setDayFilter([1,2,3,4,5])}>Dias úteis</Button>
                            <Button variant="outline" size="sm" onClick={() => setDayFilter([0,6])}>Finais de semana</Button>
                            <Button variant="ghost" size="sm" onClick={() => setDayFilter([])}>Todos</Button>
                        </div>
                    </div>

                    {/* Profit Filter */}
                    <div className="space-y-2">
                        <Label htmlFor="profit-filter" className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Filtro por Lucro
                        </Label>
                        <Select value={profitFilter} onValueChange={setProfitFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os lucros</SelectItem>
                                <SelectItem value="positive">Apenas positivos</SelectItem>
                                <SelectItem value="negative">Apenas negativos</SelectItem>
                                <SelectItem value="range">Faixa personalizada</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        {profitFilter === 'range' && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <Label htmlFor="min-profit" className="text-xs">Lucro mínimo</Label>
                                    <Input
                                        id="min-profit"
                                        type="number"
                                        step="0.01"
                                        placeholder="R$ 0,00"
                                        value={minProfit}
                                        onChange={(e) => setMinProfit(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="max-profit" className="text-xs">Lucro máximo</Label>
                                    <Input
                                        id="max-profit"
                                        type="number"
                                        step="0.01"
                                        placeholder="R$ 1000,00"
                                        value={maxProfit}
                                        onChange={(e) => setMaxProfit(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Clear Filters */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            Ações
                        </Label>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setDateFilter('all');
                                setProfitFilter('all');
                                setDayFilter([]);
                                setCustomDateStart('');
                                setCustomDateEnd('');
                                setMinProfit('');
                                setMaxProfit('');
                            }}
                            className="w-full"
                        >
                            Limpar Filtros
                        </Button>
                        <div className="text-xs text-muted-foreground">
                            {filteredStats.totalBets} de {summaryStats.totalBets} apostas
                        </div>
                    </div>
                </div>
             </div>

             <h3 className="text-2xl font-bold mb-4">Minhas Apostas</h3>
            <Tabs defaultValue="all" onValueChange={setFilterStatus} className="w-full">
                <TabsList className="w-full mb-6 overflow-x-auto whitespace-nowrap flex gap-2">
                    <TabsTrigger value="all">Todas</TabsTrigger>
                    <TabsTrigger value="pending">Em Andamento</TabsTrigger>
                    <TabsTrigger value="won">Ganhos</TabsTrigger>
                    <TabsTrigger value="lost">Perdidas</TabsTrigger>
                    <TabsTrigger value="other">Outras</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all">{renderBetList()}</TabsContent>
                <TabsContent value="pending">{renderBetList()}</TabsContent>
                <TabsContent value="won">{renderBetList()}</TabsContent>
                <TabsContent value="lost">{renderBetList()}</TabsContent>
                <TabsContent value="other">{renderBetList()}</TabsContent>
            </Tabs>

            {/* Bet Form Dialog */}
            <Dialog open={isBetFormOpen} onOpenChange={isOpen => {
                if(!isOpen) { setIsBetFormOpen(false); setBetToEdit(null); }
            }}>
                <DialogContent className="max-w-2xl p-0">
                    <BetForm 
                        onSave={handleSaveBet}
                        betToEdit={betToEdit}
                        bookmakers={bookmakers}
                        onCancel={() => { setIsBetFormOpen(false); setBetToEdit(null); }}
                    />
                </DialogContent>
            </Dialog>

            {/* Bookmaker Form Dialog */}
            <Dialog open={isBookmakerFormOpen} onOpenChange={isOpen => {
                if (!isOpen) { setIsBookmakerFormOpen(false); setBookmakerToEdit(null); }
            }}>
                <DialogContent className="max-w-md p-0">
                    <BookmakerForm
                        onSave={handleSaveBookmaker}
                        bookmakerToEdit={bookmakerToEdit}
                        onCancel={() => { setIsBookmakerFormOpen(false); setBookmakerToEdit(null); }}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Bet Dialog */}
            <AlertDialog open={!!betToDelete} onOpenChange={(isOpen) => !isOpen && setBetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>
                        <div className="flex items-center gap-2"> <AlertTriangle className="text-destructive"/> Você tem certeza? </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Essa ação não pode ser desfeita. Isso excluirá permanentemente a aposta em <strong className="text-foreground">"{betToDelete?.event}"</strong>.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => betToDelete && handleDeleteBet(betToDelete.id)}> Sim, excluir aposta </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Totals Dialog */}
            <Dialog open={isTotalsDialogOpen} onOpenChange={(isOpen) => setIsTotalsDialogOpen(isOpen)}>
                <DialogContent className="max-w-md">
                    <CardHeader className="pb-2">
                        <CardTitle>Editar Totais do Resumo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="initial_total">Banca Inicial Total</Label>
                            <Input id="initial_total" value={overrideInitial} onChange={e => setOverrideInitial(formatCurrencyInput(e.target.value))} onBlur={(e) => {
                                const n = parseNumber(e.target.value);
                                if (typeof n === 'number') {
                                    setOverrideInitial(n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                                }
                            }} placeholder={displayInitialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="current_total">Banca Atual Total</Label>
                            <Input id="current_total" value={overrideCurrent} onChange={e => setOverrideCurrent(formatCurrencyInput(e.target.value))} onBlur={(e) => {
                                const n = parseNumber(e.target.value);
                                if (typeof n === 'number') {
                                    setOverrideCurrent(n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                                }
                            }} placeholder={displayCurrentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsTotalsDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveTotalsOverride}><Save className="w-4 h-4 mr-2" />Salvar</Button>
                        </div>
                    </CardContent>
                </DialogContent>
            </Dialog>

            {/* Delete Bookmaker Dialog */}
             <AlertDialog open={!!bookmakerToDelete} onOpenChange={(isOpen) => !isOpen && setBookmakerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>
                        <div className="flex items-center gap-2"> <AlertTriangle className="text-destructive"/> Tem certeza? </div>
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Isso excluirá permanentemente a casa de apostas <strong className="text-foreground">"{bookmakerToDelete?.name}"</strong> e todo o seu histórico. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bookmakerToDelete && handleDeleteBookmaker(bookmakerToDelete.id)}> Sim, excluir casa </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

    

    
