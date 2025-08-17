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
    if (bet.result === 'won') {
      return bet.stake * bet.odds - bet.stake;
    }
    if (bet.result === 'lost') {
      return -bet.stake;
    }
    return 0;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Match</TableHead>
          <TableHead className="hidden sm:table-cell">Market</TableHead>
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
                <div className="font-medium">{bet.selection}</div>
                <div className="hidden text-sm text-muted-foreground md:inline">
                  {bet.match}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{bet.market}</TableCell>
              <TableCell className="hidden lg:table-cell">
                {format(new Date(bet.date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell className="text-right">
                {bet.stake.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                })}
              </TableCell>
              <TableCell className="text-right">{bet.odds.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <Badge
                  variant="outline"
                  className={cn(
                    bet.result === 'pending' && 'text-muted-foreground',
                    bet.result === 'won' && 'border-accent text-accent',
                    bet.result === 'lost' && 'border-destructive text-destructive'
                  )}
                >
                  {profit.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
