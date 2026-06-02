"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import type { Bet, Bookmaker, FreeSpin } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BookmakerCardProps {
    bookmaker: Bookmaker;
    bets: Bet[];
    freeSpins: FreeSpin[];
    onEdit: () => void;
    onDelete: () => void;
    stats?: { profit: number; currentBalance: number };
    hideCurrentBalance?: boolean;
}

export function BookmakerCard({ bookmaker, onEdit, onDelete, hideCurrentBalance = false }: BookmakerCardProps) {
    const currentBalance = bookmaker.currentBalance ?? bookmaker.initialBankroll ?? 0;
    const profit = currentBalance - (bookmaker.initialBankroll ?? 0);
    const hiddenValue = "R$ •••••";

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
                    <p className="text-3xl font-bold">
                        {hideCurrentBalance ? hiddenValue : currentBalance.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                    </p>
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
                        {profit >= 0 ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
                         <div>
                            <p className={cn("font-semibold", profit >= 0 ? "text-green-500" : "text-destructive")}>
                                {hideCurrentBalance ? hiddenValue : profit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                            </p>
                            <p className="text-xs text-muted-foreground">Lucro/Prejuízo</p>
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
