"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Bet } from '@/lib/types';
import { Header } from "@/components/layout/header";
import { Button } from '@/components/ui/button';
import { PlusCircle, BarChart, AlertTriangle, Calendar, TrendingUp, TrendingDown, Calculator, Scale, Target, Landmark, Wallet } from 'lucide-react';
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
import { SurebetCalculator } from '@/components/bets/surebet-calculator';
import { AdvancedSurebetCalculator } from '@/components/bets/advanced-surebet-calculator';
import { isToday, isThisWeek, isThisMonth, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { INITIAL_BETS } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


type Period = 'day' | 'week' | 'month';

export default function BetsPage() {
    const [bets, setBets] = useState<Bet[]>(INITIAL_BETS.map(b => ({...b, date: new Date(b.date)})));
    const [isLoading, setIsLoading] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [betToEdit, setBetToEdit] = useState<Bet | null>(null);
    const [betToDelete, setBetToDelete] = useState<Bet | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("pending");
    const [summaryPeriod, setSummaryPeriod] = useState<Period>('day');
    const [initialBankroll, setInitialBankroll] = useState<number>(5000);
    const { toast } = useToast();

    // The logic to sync with Firestore would go here in a real app,
    // but for now, we manage state locally.

    const summaryStats = useMemo(() => {
        const calculateProfitForPeriod = (startDate: Date) => {
            const periodBets = bets.filter(bet => new Date(bet.date) >= startDate && (bet.status === 'won' || bet.status === 'lost'));
            
            return periodBets.reduce((acc, bet) => {
                 if (bet.type === 'single') {
                    const stake = bet.stake ?? 0;
                    const odds = bet.odds ?? 0;
                    if (bet.status === 'won') return acc + (stake * odds) - stake;
                    if (bet.status === 'lost') return acc - stake;
                 } else if (bet.type === 'surebet' && bet.status === 'won') {
                    return acc + (bet.guaranteedProfit ?? 0);
                 } else if (bet.type === 'surebet' && bet.status === 'lost') {
                     return acc - (bet.totalStake ?? 0);
                 }
                 return acc;
            }, 0);
        };
        
        const now = new Date();
        const dailyProfit = calculateProfitForPeriod(startOfDay(now));
        const weeklyProfit = calculateProfitForPeriod(startOfWeek(now, { weekStartsOn: 1 }));
        const monthlyProfit = calculateProfitForPeriod(startOfMonth(now));

        const allTimeProfit = calculateProfitForPeriod(new Date(0)); // From the beginning of time
        const currentBankroll = initialBankroll + allTimeProfit;
        
        return {
            dailyProfit,
            weeklyProfit,
            monthlyProfit,
            currentBankroll
        }
    }, [bets, initialBankroll]);

     const filteredBets = useMemo(() => {
        const otherStatuses: Bet['status'][] = ['cashed_out', 'void'];
        if (filterStatus === 'all') return bets;
        if (filterStatus === 'other') {
            return bets.filter(bet => otherStatuses.includes(bet.status));
        }
        return bets.filter(bet => bet.status === filterStatus);
    }, [bets, filterStatus]);


    const handleOpenForm = (bet: Bet | null = null) => {
        setBetToEdit(bet);
        setIsFormOpen(true);
    }

    const handleSaveBet = (betData: Omit<Bet, 'id'>) => {
        const sanitizedBetData = JSON.parse(JSON.stringify(betData));
    
        if (betToEdit) {
            setBets(bets.map(b => (b.id === betToEdit.id ? { ...b, ...sanitizedBetData, id: b.id, date: new Date(sanitizedBetData.date) } : b)));
            toast({ title: "Aposta Atualizada!", description: `A aposta no evento "${betData.event}" foi atualizada.` });
        } else {
            const newBet: Bet = {
                id: new Date().getTime().toString(),
                ...sanitizedBetData,
                date: new Date(sanitizedBetData.date),
            };
            setBets([newBet, ...bets]);
            toast({ title: "Aposta Adicionada!", description: `Sua aposta em "${betData.event}" foi registrada.` });
        }
        setIsFormOpen(false);
        setBetToEdit(null);
    };

    const handleDeleteBet = (betId: string) => {
        const bet = bets.find(b => b.id === betId);
        if (!bet) return;
        setBets(bets.filter(b => b.id !== betId));
        setBetToDelete(null);
        toast({ variant: 'destructive', title: "Aposta Excluída!", description: `A aposta em "${bet.event}" foi removida.` });
    }

    const renderBetList = () => {
        if (isLoading) {
             return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[250px] w-full" />
                    ))}
                </div>
            )
        }
        
        if (filteredBets.length > 0) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBets.map(bet => (
                        <BetCard 
                            key={bet.id} 
                            bet={bet} 
                            onEdit={() => handleOpenForm(bet)}
                            onDelete={() => setBetToDelete(bet)}
                        />
                    ))}
                 </div>
            )
        }
        
        return (
            <div className="text-center py-20 bg-muted rounded-lg">
                <h3 className="text-2xl font-bold">Nenhuma Aposta Encontrada</h3>
                <p className="text-muted-foreground mt-2 mb-6">Não há apostas com este status. Adicione uma nova aposta ou mude o filtro.</p>
                <Button size="lg" onClick={() => handleOpenForm()}>
                    <PlusCircle className="mr-2"/>
                    Adicionar Aposta
                </Button>
            </div>
        )
    }

    return (
        <>
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl font-bold mb-1 flex items-center gap-2">
                        <BarChart className="w-8 h-8 text-primary" />
                        Dashboard de Apostas
                        </h2>
                        <p className="text-muted-foreground">
                            Gerencie suas apostas, analise riscos e acompanhe seus resultados.
                        </p>
                    </div>
                    <Button size="lg" onClick={() => handleOpenForm()} className="w-full md:w-auto">
                        <PlusCircle className="mr-2"/>
                        Adicionar Aposta
                    </Button>
                </div>
                
                 <div className="mb-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                         <h3 className="text-2xl font-bold flex items-center gap-2">
                            <Wallet className="w-7 h-7 text-primary" />
                            Gestão de Banca
                         </h3>
                         <div className="flex items-center gap-4 w-full md:w-auto">
                             <div className='flex-1'>
                                <Label htmlFor="bankroll" className="text-sm font-medium">Banca Inicial</Label>
                                <div className="relative">
                                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="bankroll"
                                        type="number"
                                        step="10"
                                        value={initialBankroll}
                                        onChange={(e) => setInitialBankroll(Number(e.target.value))}
                                        className="pl-9 font-medium"
                                    />
                                </div>
                            </div>
                         </div>
                    </div>
                     {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-[116px] w-full" />
                            ))}
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                             <SummaryCard
                                title="Banca Atual"
                                value={summaryStats.currentBankroll}
                                icon={Landmark}
                                isCurrency
                            />
                            <SummaryCard
                                title="Lucro/Prejuízo (Dia)"
                                value={summaryStats.dailyProfit}
                                icon={summaryStats.dailyProfit >= 0 ? TrendingUp : TrendingDown}
                                isCurrency
                                valueClassName={summaryStats.dailyProfit >= 0 ? "text-green-500" : "text-destructive"}
                            />
                             <SummaryCard
                                title="Lucro/Prejuízo (Semana)"
                                value={summaryStats.weeklyProfit}
                                icon={summaryStats.weeklyProfit >= 0 ? TrendingUp : TrendingDown}
                                isCurrency
                                valueClassName={summaryStats.weeklyProfit >= 0 ? "text-green-500" : "text-destructive"}
                            />
                              <SummaryCard
                                title="Lucro/Prejuízo (Mês)"
                                value={summaryStats.monthlyProfit}
                                icon={summaryStats.monthlyProfit >= 0 ? TrendingUp : TrendingDown}
                                isCurrency
                                valueClassName={summaryStats.monthlyProfit >= 0 ? "text-green-500" : "text-destructive"}
                            />
                        </div>
                     )}
                </div>

                <div className="mb-8">
                     <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                        <Calculator className="w-7 h-7 text-primary" />
                        Calculadoras de Surebet
                     </h3>
                    <Tabs defaultValue="simple" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="simple">Calculadora Simples</TabsTrigger>
                            <TabsTrigger value="advanced">Calculadora Avançada</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="simple">
                            <SurebetCalculator />
                        </TabsContent>
                        
                        <TabsContent value="advanced">
                            <AdvancedSurebetCalculator />
                        </TabsContent>
                    </Tabs>
                </div>

                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                    <div className="lg:col-span-3 h-[360px]">
                        <BetPerformanceChart data={bets} isLoading={isLoading}/>
                    </div>
                    <div className="lg:col-span-2 h-[360px]">
                        <BetStatusChart data={bets} isLoading={isLoading}/>
                    </div>
                 </div>
                 
                 <h3 className="text-2xl font-bold mb-4">Minhas Apostas</h3>
                <Tabs defaultValue="pending" onValueChange={setFilterStatus} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-6">
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
            </main>
        </div>

        <Dialog open={isFormOpen} onOpenChange={isOpen => {
            if(!isOpen) {
                setIsFormOpen(false);
                setBetToEdit(null);
            }
        }}>
            <DialogContent className="max-w-2xl p-0">
                <BetForm 
                    onSave={handleSaveBet}
                    betToEdit={betToEdit}
                    onCancel={() => {
                        setIsFormOpen(false);
                        setBetToEdit(null);
                    }}
                />
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!betToDelete} onOpenChange={(isOpen) => !isOpen && setBetToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive"/>
                        Você tem certeza absoluta?
                    </div>
                </AlertDialogTitle>
                <AlertDialogDescription>
                    Essa ação não pode ser desfeita. Isso excluirá permanentemente a aposta no evento <strong className="text-foreground">"{betToDelete?.event}"</strong>.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => betToDelete && handleDeleteBet(betToDelete.id)}>
                    Sim, excluir aposta
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}
