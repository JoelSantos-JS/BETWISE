import React from 'react';
import type { Bet } from '@/lib/types';
import { Button } from '../ui/button';

interface BetFormProps {
  onSave: (bet: Omit<Bet, 'id'>) => void;
  betToEdit: Bet | null;
  onCancel: () => void;
}

export function BetForm({ onSave, betToEdit, onCancel }: BetFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // This is a simplified form. In a real app, you'd have inputs and state management.
    const mockBet: Omit<Bet, 'id'> = betToEdit || {
        event: 'New Event',
        sport: 'Football',
        market: 'Winner',
        selection: 'Team A',
        stake: 10,
        odds: 2.0,
        status: 'pending',
        type: 'single',
        date: new Date().toISOString(),
    };
    onSave(mockBet);
  };
  return (
    <form onSubmit={handleSubmit} className="p-6">
        <h2 className="text-2xl font-bold mb-4">{betToEdit ? 'Editar Aposta' : 'Adicionar Aposta'}</h2>
        <div className="space-y-4">
            {/* Form fields would go here */}
            <p className="text-muted-foreground">Formulário de aposta aqui.</p>
        </div>
        <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit">Salvar Aposta</Button>
        </div>
    </form>
  );
}
