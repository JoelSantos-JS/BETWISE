"use client"

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, TrendingUp, TrendingDown, Wallet, Landmark } from "lucide-react";
import type { Bet, Bookmaker } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BookmakerCardProps {
    bookmaker: Bookmaker;
    bets: Bet[];
    onEdit: () => void;
    onDelete: () => void;
}

export function BookmakerCard({ bookmaker, bets, onEdit, onDelete }: BookmakerCardProps) {
    const stats = useMemo(() => {
        const relevantBets = bets.filter(bet => {
            if (bet.type === 'single') return bet.bookmaker === bookmaker.name;
            // For surebets, we need to check sub-bets
            if (bet.type === 'surebet') return bet.subBets?.some(sb => sb.bookmaker === bookmaker.name);
            return false;
        }).filter(bet => ['won', 'lost'].includes(bet.status));

        const profit = relevantBets.reduce((acc, bet) => {
            if (bet.type === 'single') {
                 if (bet.status === 'won') return acc + (bet.stake! * bet.odds! - bet.stake!);
                 if (bet.status === 'lost') return acc - bet.stake!;
            } else if (bet.type === 'surebet') {
                const subBet = bet.subBets?.find(sb => sb.bookmaker === bookmaker.name);
                if (!subBet) return acc;
                // Simplified profit calc for the house's perspective
                if (bet.status === 'won') { // This means one leg of the surebet won
                    const isWinningBet = subBet.stake * subBet.odds > (bet.totalStake ?? subBet.stake);
                    return acc + (isWinningBet ? (subBet.stake * subBet.odds - subBet.stake) : -subBet.stake);
                } else if (bet.status === 'lost') { // A surebet "lost" means something went wrong, assume loss of stake
                     return acc - subBet.stake;
                }
            }
            return acc;
        }, 0);

        const currentBalance = bookmaker.initialBankroll + profit;

        return { profit, currentBalance };
    }, [bookmaker, bets]);

    return (
        <Card className="flex flex-col h-full">
            <CardHeader className="flex-row items-start justify-between">
                <div>
                    <CardTitle>{bookmaker.name}</CardTitle>
                    <CardDescription>Banca Dedicada</CardDescription>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Saldo Atual</p>
                    <p className="text-3xl font-bold">{stats.currentBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                         <Landmark className="w-5 h-5 text-muted-foreground"/>
                         <div>
                            <p className="font-semibold">{bookmaker.initialBankroll.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                            <p className="text-xs text-muted-foreground">Banca Inicial</p>
                         </div>
                    </div>
                     <div className="flex items-center gap-2">
                        {stats.profit >= 0 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                         <div>
                            <p className={cn("font-semibold", stats.profit >= 0 ? "text-green-500" : "text-destructive")}>{stats.profit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                            <p className="text-xs text-muted-foreground">Lucro/Prejuízo</p>
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

    