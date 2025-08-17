import React from 'react';
import type { Bet } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash } from 'lucide-react';

interface BetCardProps {
  bet: Bet;
  onEdit: () => void;
  onDelete: () => void;
}

export function BetCard({ bet, onEdit, onDelete }: BetCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{bet.event}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Market: {bet.market}</p>
        <p>Selection: {bet.selection}</p>
        <p>Status: {bet.status}</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={onEdit}><Edit className="w-4 h-4" /></Button>
        <Button variant="destructive" size="icon" onClick={onDelete}><Trash className="w-4 h-4" /></Button>
      </CardFooter>
    </Card>
  );
}
