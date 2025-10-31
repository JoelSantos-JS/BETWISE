"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, DollarSign, Percent, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';

type OddInput = {
  id: number;
  value: string;
};

type CalculationResult = {
  stakes: number[];
  lucro: number;
  roi: number;
  retornos: number[];
};

function calculateDistribution(oddInputs: OddInput[], totalStake: number): CalculationResult | null {
  const odds = oddInputs.map(input => parseFloat(input.value)).filter(odd => !isNaN(odd) && odd > 0);
  
  if (odds.length < 2 || totalStake <= 0) {
    return null;
  }

  const S = odds.reduce((sum, odd) => sum + 1 / odd, 0);

  const stakes = odds.map(odd => (totalStake / odd) / S);
  const retornos = stakes.map((stake, i) => stake * odds[i]);
  // Use a média dos retornos, pois eles deveriam ser teoricamente iguais
  const lucro = (retornos[0] || 0) - totalStake;
  const roi = (lucro / totalStake) * 100;

  return {
    stakes,
    lucro,
    roi,
    retornos,
  };
}

export function SurebetCalculator() {
  const [totalStake, setTotalStake] = useState('100');
  const [oddInputs, setOddInputs] = useState([
    { id: 1, value: '2.10' },
    { id: 2, value: '2.20' },
  ]);

  const handleAddOddInput = () => {
    const newId = oddInputs.length > 0 ? Math.max(...oddInputs.map(o => o.id)) + 1 : 1;
    setOddInputs([...oddInputs, { id: newId, value: '' }]);
  };

  const handleRemoveOddInput = (id: number) => {
    setOddInputs(oddInputs.filter(odd => odd.id !== id));
  };

  const handleOddInputChange = (id: number, newValue: string) => {
    setOddInputs(oddInputs.map(odd => (odd.id === id ? { ...odd, value: newValue } : odd)));
  };

  const calculation = useMemo(() => calculateDistribution(oddInputs, parseFloat(totalStake)), [oddInputs, totalStake]);

  const isSurebet = calculation ? calculation.roi > 0 : false;

  return (
    <Card className="bg-card/50 border-dashed">
      <CardHeader>
        <CardTitle className="text-xl">Calculadora de Surebet Simples</CardTitle>
        <CardDescription>Insira as odds e o valor total para encontrar o lucro garantido.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="total-stake">Valor Total a Apostar (R$)</Label>
            <Input
            id="total-stake"
            type="number"
            placeholder="ex: 100.00"
            value={totalStake}
            onChange={(e) => setTotalStake(e.target.value)}
            className="max-w-xs text-lg font-mono"
            />
        </div>

        <div className="space-y-4">
          <Label>Odds das Casas de Apostas</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {oddInputs.map((oddInput, index) => (
              <div key={oddInput.id} className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={`Odd ${index + 1}`}
                  value={oddInput.value}
                  onChange={(e) => handleOddInputChange(oddInput.id, e.target.value)}
                  className="font-mono"
                />
                {oddInputs.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOddInput(oddInput.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={handleAddOddInput}>
            <PlusCircle className="mr-2" /> Adicionar Odd
          </Button>
        </div>

        {calculation && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Resultado da Simulação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className={cn("md:col-span-3 p-4 border rounded-lg flex items-center gap-3",
                    isSurebet ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                )}>
                    {isSurebet ? <ShieldCheck className="w-6 h-6 text-green-500" /> : <AlertCircle className="w-6 h-6 text-red-500" />}
                    <div>
                        <h3 className={cn("font-bold", isSurebet ? "text-green-500" : "text-red-500")}>
                            {isSurebet ? "LUCRO GARANTIDO (SUREBET)" : "PREJUÍZO CALCULADO"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {isSurebet ? "Esta operação garante lucro, independentemente do resultado." : "Com as odds atuais, a operação resultará em prejuízo."}
                        </p>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {calculation.stakes.map((stake, i) => (
                        <div key={i} className='p-4 bg-background rounded-lg'>
                            <p className="text-sm text-muted-foreground mb-1">Aposta na Odd {parseFloat(oddInputs[i].value).toFixed(2)}</p>
                            <p className="text-xl font-bold">{stake.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                    ))}
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className='p-4 bg-background rounded-lg'>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><DollarSign /> Lucro/Prejuízo</p>
                        <p className={cn("text-2xl font-bold", isSurebet ? "text-green-500" : "text-destructive")}>
                            {calculation.lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                        <div className='p-4 bg-background rounded-lg'>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><Percent /> Retorno sobre Investimento (ROI)</p>
                        <p className={cn("text-2xl font-bold", isSurebet ? "text-green-500" : "text-destructive")}>
                            {calculation.roi.toFixed(2)}%
                        </p>
                    </div>
                        <div className='p-4 bg-background rounded-lg'>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><ShieldCheck /> Retorno Total</p>
                        <p className="text-2xl font-bold">{calculation.retornos[0]?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
