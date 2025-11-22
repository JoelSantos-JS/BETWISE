'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Bet } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function BettingTable({ bets }: { bets: Bet[] }) {
  const calculateProfit = (bet: Bet) => {
    if (bet.type === 'single') {
      const stake = bet.stake ?? 0;
      const odds = bet.odds ?? 0;
      if (bet.status === 'won') return stake * odds - stake;
      if (bet.status === 'lost') return -stake;
      return 0;
    }
    if (bet.type === 'surebet' || bet.type === 'pa_surebet') {
      const totalStake = bet.subBets
        ? (bet.subBets.reduce((s, sb) => s + ((sb.isFreebet ? 0 : (sb.stake ?? 0))), 0) ?? 0)
        : (bet.totalStake ?? 0);
      if (bet.status === 'won') return (bet.guaranteedProfit ?? 0);
      if (bet.status === 'lost') return -totalStake;
      return 0;
    }
    return 0;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Evento</TableHead>
          <TableHead className="hidden sm:table-cell">Tipo de Aposta</TableHead>
          <TableHead className="hidden lg:table-cell">Date</TableHead>
          <TableHead className="text-right">Stake</TableHead>
          <TableHead className="text-right">Odds</TableHead>
          <TableHead className="text-right">P/L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bets.map((bet) => {
          const profit = calculateProfit(bet);
          return (
            <TableRow key={bet.id}>
              <TableCell>
                <div className="font-medium">{bet.event}</div>
                <div className="hidden text-sm text-muted-foreground md:inline">
                  {bet.betType}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{bet.betType}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {format(new Date(bet.date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                {(bet.stake ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </TableCell>
              <TableCell className="text-right">{(bet.odds ?? 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={cn(
                    bet.status === 'pending' && 'text-muted-foreground',
                    bet.status === 'won' && 'border-accent text-accent',
                    bet.status === 'lost' && 'border-destructive text-destructive'
                  )}
                >
                  {profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
