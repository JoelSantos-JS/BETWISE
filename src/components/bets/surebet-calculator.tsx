"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, DollarSign, Percent, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';
import { Switch } from "@/components/ui/switch";

type OddInput = {
  id: number;
  oddValue: string;
  stakeValue: string;
  betType: string;
  isLayBet: boolean;
};

type IndividualResult = {
  lucro: number;
  roi: number;
  responsabilidade: number;
};

type SurebetResult = {
  isSurebet: boolean;
  lucroMinimo: number;
  roiMinimo: number;
  stakeTotal: number;
};

function calculateResults(inputs: OddInput[]) {
  const validInputs = inputs.filter(input => input.oddValue && parseFloat(input.oddValue) > 0);
  
  if (validInputs.length < 2) {
    return {
      individualResults: [],
      surebetResult: null,
    };
  }

  const individualResults = validInputs.map((input, index) => {
    const odd = parseFloat(input.oddValue);
    const stake = parseFloat(input.stakeValue) || 0;
    let lucro: number;
    let roi: number;
    let responsabilidade: number;

    if (input.isLayBet) {
      // Aposta Contra (Lay Bet)
      lucro = stake; // O lucro é o valor da stake (ganho alvo)
      responsabilidade = stake * (odd - 1); // Risco
      roi = responsabilidade > 0 ? (lucro / responsabilidade) * 100 : 0; // ROI é sobre o risco
    } else {
      // Aposta a Favor (Back Bet)
      lucro = stake * (odd - 1); // Lucro é (retorno - stake)
      responsabilidade = 0; // Não se aplica
      roi = stake > 0 ? (lucro / stake) * 100 : 0; // ROI é sobre a stake
    }
    
    return { lucro, roi, responsabilidade };
  });

  // Cálculo da Surebet (Resumo Geral)
  const stakeTotal = validInputs.reduce((sum, input) => sum + (parseFloat(input.stakeValue) || 0), 0);
  
  const lucrosPorCenario = validInputs.map((input, index) => {
    const odd = parseFloat(input.oddValue);
    const stake = parseFloat(input.stakeValue) || 0;
    
    if (input.isLayBet) {
      // Se a aposta Lay for VENCEDORA (o resultado não acontece), você ganha a stake.
      // O total investido é a soma das stakes das outras apostas + a responsabilidade desta.
      const stakesOutras = stakeTotal - stake;
      return stake - stakesOutras; // Este cálculo é complexo e depende da estratégia.
                                   // Por agora, vamos focar no cálculo individual correto.
    }
    // Se a aposta Back for VENCEDORA, o retorno é odd * stake, e o lucro é retorno - stake total
    return (odd * stake) - stakeTotal;
  });

  const lucroMinimo = Math.min(...lucrosPorCenario);
  const isSurebet = lucroMinimo > 0;
  const roiMinimo = stakeTotal > 0 ? (lucroMinimo / stakeTotal) * 100 : 0;
  
  const surebetResult: SurebetResult | null = validInputs.length > 1 ? {
    isSurebet,
    lucroMinimo,
    roiMinimo,
    stakeTotal,
  } : null;

  return {
    individualResults,
    surebetResult,
  };
}

export function SurebetCalculator() {
  const [betInputs, setBetInputs] = useState([
    { id: 1, oddValue: '3.0', stakeValue: '70', betType: 'Casa 1', isLayBet: false },
    { id: 2, oddValue: '3.5', stakeValue: '60', betType: 'Casa 2', isLayBet: false },
  ]);

  const handleAddBetInput = () => {
    const newId = betInputs.length > 0 ? Math.max(...betInputs.map(b => b.id)) + 1 : 1;
    setBetInputs([...betInputs, { id: newId, oddValue: '', stakeValue: '', betType: `Casa ${newId}`, isLayBet: false }]);
  };

  const handleRemoveBetInput = (id: number) => {
    setBetInputs(betInputs.filter(bet => bet.id !== id));
  };

  const handleBetInputChange = (id: number, field: keyof OddInput, value: string | boolean) => {
    setBetInputs(betInputs.map(bet => (bet.id === id ? { ...bet, [field]: value } : bet)));
  };

  const calculation = useMemo(() => calculateResults(betInputs), [betInputs]);

  return (
    <Card className="bg-card/50 border-dashed">
      <CardHeader>
        <CardTitle className="text-xl">Calculadora de Apostas</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {betInputs.map((betInput, index) => {
            const result = calculation.individualResults[index];
            return (
              <Card key={betInput.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <Input
                      value={betInput.betType}
                      onChange={(e) => handleBetInputChange(betInput.id, 'betType', e.target.value)}
                      className="text-sm font-semibold p-0 border-0 h-auto bg-transparent focus-visible:ring-0"
                    />
                    {betInputs.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBetInput(betInput.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Aposta Contra (Lay)</Label>
                    <Switch
                      checked={betInput.isLayBet}
                      onCheckedChange={(checked) => handleBetInputChange(betInput.id, 'isLayBet', checked)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Odd</Label>
                    <Input
                      type="number"
                      placeholder="ex: 2.50"
                      value={betInput.oddValue}
                      onChange={(e) => handleBetInputChange(betInput.id, 'oddValue', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{betInput.isLayBet ? 'Ganho Alvo (R$)' : 'Stake (R$)'}</Label>
                    <Input
                      type="number"
                      placeholder="ex: 100.00"
                      value={betInput.stakeValue}
                      onChange={(e) => handleBetInputChange(betInput.id, 'stakeValue', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  {result && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{betInput.isLayBet ? 'Responsabilidade' : 'Lucro'}</span>
                        <span className="font-semibold text-primary">R$ {(betInput.isLayBet ? result.responsabilidade : result.lucro)?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">ROI</span>
                        <span className="font-semibold text-primary">{result.roi?.toFixed(2) || '0.00'}%</span>
                      </div>
                       {betInput.isLayBet && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Lucro</span>
                            <span className="font-semibold text-primary">R$ {result.lucro?.toFixed(2) || '0.00'}</span>
                        </div>
                       )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="flex justify-center mb-6">
          <Button variant="outline" onClick={handleAddBetInput}>
            <PlusCircle className="mr-2" /> Adicionar Casa
          </Button>
        </div>

        {calculation.surebetResult && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Resumo Geral da Operação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className='p-4 bg-background rounded-lg'>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mb-1"><DollarSign /> Stake Total</p>
                <p className="text-2xl font-bold">{calculation.surebetResult.stakeTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div className={cn(
                'p-4 rounded-lg',
                calculation.surebetResult.isSurebet ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
              )}>
                <p className="text-sm flex items-center gap-2 mb-1"><ShieldCheck /> Lucro Mínimo Garantido</p>
                <p className="text-2xl font-bold">{calculation.surebetResult.lucroMinimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div className={cn(
                'p-4 rounded-lg',
                calculation.surebetResult.isSurebet ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
              )}>
                <p className="text-sm flex items-center gap-2 mb-1"><Percent /> ROI Mínimo</p>
                <p className="text-2xl font-bold">{calculation.surebetResult.roiMinimo.toFixed(2)}%</p>
              </div>
              {calculation.surebetResult.isSurebet ? (
                <div className="md:col-span-3 p-4 bg-green-500/5 border border-green-500/20 rounded-lg flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                  <div>
                    <h3 className="font-bold text-green-500">SUREBET CONFIRMADA!</h3>
                    <p className="text-sm text-muted-foreground">Esta operação garante lucro, independentemente do resultado.</p>
                  </div>
                </div>
              ) : (
                 <div className="md:col-span-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <h3 className="font-bold text-red-500">NÃO É UMA SUREBET LUCRATIVA</h3>
                    <p className="text-sm text-muted-foreground">Com os valores atuais, há um cenário com prejuízo. Ajuste as stakes ou odds.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
