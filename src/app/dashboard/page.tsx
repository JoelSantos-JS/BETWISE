
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Bet, Bookmaker as BookmakerType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, BarChart, AlertTriangle, Save, TrendingUp, TrendingDown, Calculator, Wallet, Landmark, Building, FileDown, Loader2 } from 'lucide-react';
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
import { TradingCalculator } from '@/components/bets/trading-calculator';
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, Timestamp, writeBatch } from 'firebase/firestore';
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
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    
    // Dialog/Modal states
    const [isBetFormOpen, setIsBetFormOpen] = useState(false);
    const [betToEdit, setBetToEdit] = useState<Bet | null>(null);
    const [betToDelete, setBetToDelete] = useState<Bet | null>(null);
    const [isBookmakerFormOpen, setIsBookmakerFormOpen] = useState(false);
    const [bookmakerToEdit, setBookmakerToEdit] = useState<BookmakerType | null>(null);
    const [bookmakerToDelete, setBookmakerToDelete] = useState<BookmakerType | null>(null);

    // Filter states
    const [filterStatus, setFilterStatus] = useState<string>("pending");
    
    const { toast } = useToast();

    // Data fetching
    const fetchUserData = useCallback(async (userId: string) => {
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
                    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date)
                } as Bet;
            });
            setBets(betsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            
            const bookmakersData = bookmakersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as BookmakerType);
            setBookmakers(bookmakersData);

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

        const allTimeProfit = bets.reduce((acc, bet) => {
             if (bet.status !== 'won' && bet.status !== 'lost') return acc;

             if (bet.type === 'single') {
                const stake = bet.stake ?? 0;
                const odds = bet.odds ?? 0;
                if (bet.status === 'won') return acc + (stake * odds) - stake;
                if (bet.status === 'lost') return acc - stake;
             } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
                 // Profit is calculated from the winning leg, not just the guaranteed one, for total P/L
                 const wonSubBet = bet.subBets?.find(sb => sb.id.endsWith(bet.status)); // Simplified assumption
                 if (bet.status === 'won' && bet.guaranteedProfit) return acc + bet.guaranteedProfit;
                 if (bet.status === 'lost') return acc - (bet.totalStake ?? 0);
             }
             return acc;
        }, 0);

        const currentBankroll = totalInitialBankroll + allTimeProfit;
        
        return {
            totalInitialBankroll,
            allTimeProfit,
            currentBankroll,
            totalBets: bets.length,
            winRate: bets.length > 0 ? (bets.filter(b => b.status === 'won').length / bets.filter(b => ['won', 'lost'].includes(b.status)).length) * 100 : 0
        }
    }, [bets, bookmakers]);

    const filteredBets = useMemo(() => {
        const otherStatuses: Bet['status'][] = ['cashed_out', 'void'];
        if (filterStatus === 'all') return bets;
        if (filterStatus === 'other') return bets.filter(bet => otherStatuses.includes(bet.status));
        return bets.filter(bet => bet.status === filterStatus);
    }, [bets, filterStatus]);
    
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
        
        if (associatedBets.length > 0) {
            toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Não é possível excluir uma casa que possui apostas associadas.' });
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
                const { profit, currentBalance } = (new BookmakerCard({bookmaker: bk, bets, onEdit: ()=>{}, onDelete: ()=>{} })).props.stats;
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
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     <SummaryCard title="Banca Inicial Total" value={summaryStats.totalInitialBankroll} icon={Landmark} isCurrency />
                     <SummaryCard title="Banca Atual Total" value={summaryStats.currentBankroll} icon={Wallet} isCurrency />
                     <SummaryCard title="Lucro/Prejuízo Total" value={summaryStats.allTimeProfit} icon={summaryStats.allTimeProfit >= 0 ? TrendingUp : TrendingDown} isCurrency valueClassName={summaryStats.allTimeProfit >= 0 ? "text-green-500" : "text-destructive"} />
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

    

    
