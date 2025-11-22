'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useMemo } from 'react';
import type { Bet } from '@/lib/types';
import { format } from 'date-fns';

export function PerformanceCharts({ bets }: { bets: Bet[] }) {
  const chartData = useMemo(() => {
    const resolvedBets = bets.filter(b => b.status !== 'pending' && b.status !== 'void');
    const sortedBets = resolvedBets.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let cumulativeProfit = 0;
    const data = sortedBets.map(bet => {
      let profit = 0;
      if (bet.type === 'single') {
        const stake = bet.stake ?? 0;
        const odds = bet.odds ?? 0;
        profit = bet.status === 'won' ? stake * odds - stake : -stake;
      } else if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
        const totalStake = bet.subBets
          ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
          : (bet.totalStake ?? 0);
        profit = bet.status === 'won' ? (bet.guaranteedProfit ?? 0) : -totalStake;
      }
      cumulativeProfit += profit;
      return {
        date: new Date(bet.date),
        profit: cumulativeProfit,
      };
    });

    // Group by day and take the last profit of the day
    const dailyData = data.reduce((acc, { date, profit }) => {
      const day = format(date, 'yyyy-MM-dd');
      acc[day] = { date: day, profit };
      return acc;
    }, {} as Record<string, { date: string, profit: number }>);

    return Object.values(dailyData);

  }, [bets]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[350px] w-full items-center justify-center">
        <p className="text-muted-foreground">Not enough data to display chart.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => format(new Date(value), 'MMM d')}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
          }}
          labelFormatter={(label) => format(new Date(label), 'PPP')}
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))' }}
          activeDot={{ r: 8, fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
