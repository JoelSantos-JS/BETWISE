"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Bet } from "@/lib/types"
import { Skeleton } from "../ui/skeleton";

type BetPerformanceChartProps = {
    data: Bet[];
    isLoading?: boolean;
}

export function BetPerformanceChart({ data, isLoading }: BetPerformanceChartProps) {
  
  const chartData = React.useMemo(() => {
    const performanceBySport = data.reduce((acc, bet) => {
        if (!acc[bet.sport]) {
            acc[bet.sport] = { sport: bet.sport, profit: 0, totalStaked: 0 };
        }
        
        if (bet.status !== 'won' && bet.status !== 'lost') return acc;

        if (bet.type === 'single') {
            if (bet.status === 'won' && bet.stake && bet.odds) {
                acc[bet.sport].profit += bet.stake * bet.odds - bet.stake;
            } else if (bet.status === 'lost' && bet.stake) {
                acc[bet.sport].profit -= bet.stake;
            }
            if(bet.stake) acc[bet.sport].totalStaked += bet.stake;
        } else if (bet.type === 'surebet') {
             if (bet.status === 'won' && bet.guaranteedProfit) {
                acc[bet.sport].profit += bet.guaranteedProfit;
            }
            // Surebets don't have losses in this model
            if(bet.totalStake) acc[bet.sport].totalStaked += bet.totalStake;
        }


        return acc;
    }, {} as Record<string, { sport: string; profit: number, totalStaked: number }>);
    
    return Object.values(performanceBySport);
  }, [data]);

  const [skeletonHeights, setSkeletonHeights] = React.useState<number[]>([]);

  React.useEffect(() => {
    if (isLoading) {
      const heights = Array.from({ length: 5 }, () => Math.random() * 80 + 10);
      setSkeletonHeights(heights);
    }
  }, [isLoading]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Desempenho por Esporte</CardTitle>
        <CardDescription>Lucro líquido por modalidade esportiva</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
            <div className="w-full h-full flex items-end gap-2 px-4">
                {skeletonHeights.map((height, i) => (
                    <Skeleton key={i} className="h-full w-full" style={{height: `${height}%`}} />
                ))}
            </div>
        ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sport" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`}/>
                <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{
                        background: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                    }}
                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
                <Legend iconType="circle" />
                <Bar dataKey="profit" name="Lucro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        ) : (
             <div className="h-full flex items-center justify-center text-center text-muted-foreground">
                <div>
                    <p>Nenhum dado para exibir.</p>
                    <p className="text-sm">Adicione apostas para ver o gráfico.</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
