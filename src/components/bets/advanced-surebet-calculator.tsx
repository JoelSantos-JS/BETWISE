"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  allocateStakes, 
  checkSurebet, 
  checkCoverage, 
  buildREScenarios, 
  buildMarketsExample,
  calculateTotalForProfit,
  calculateTheoreticalROI,
  type SurebetResult,
  type Market
} from '@/lib/surebet-math';
import { Plus, Trash2, Calculator, TrendingUp, Shield, AlertTriangle } from 'lucide-react';

interface BetInput {
  id: string;
  casa: string;
  odd: number;
  fee: number; // % de taxa
  minStake?: number;
  maxStake?: number;
  manualStake?: number;
}

interface ScenarioMarket {
  name: string;
  scenarios: string[];
}

export function AdvancedSurebetCalculator() {
  const [betInputs, setBetInputs] = useState<BetInput[]>([
    { id: '1', casa: 'Casa 1', odd: 3.00, fee: 0 },
    { id: '2', casa: 'Casa 2', odd: 3.50, fee: 0 },
    { id: '3', casa: 'Casa 3', odd: 3.90, fee: 0 }
  ]);
  
  const [totalInvestment, setTotalInvestment] = useState<number>(200);
  const [desiredProfit, setDesiredProfit] = useState<number>(0);
  const [useDesiredProfit, setUseDesiredProfit] = useState<boolean>(false);
  
  // Configuração de cenários personalizados
  const [customMarkets, setCustomMarkets] = useState<ScenarioMarket[]>([
    { name: 'M1: Vitória A & Esc A', scenarios: ['A-A'] },
    { name: 'M2: HE 0:1 Empate & Esc A', scenarios: ['EMP-A', 'B-A'] },
    { name: 'M3: Escanteios Handicap B +1', scenarios: ['A-B', 'A-EMP', 'EMP-B', 'EMP-EMP', 'B-B', 'B-EMP'] }
  ]);

  // Cálculos principais usando a biblioteca matemática
  const calculation = useMemo(() => {
    const odds = betInputs.map(bet => bet.odd);
    const fees = betInputs.map(bet => bet.fee);
    const minStakes = betInputs.map(bet => bet.minStake || null);
    const maxStakes = betInputs.map(bet => bet.maxStake || null);
    
    // Determina o total a usar
    let totalToUse = totalInvestment;
    if (useDesiredProfit && desiredProfit > 0) {
      totalToUse = calculateTotalForProfit(odds, desiredProfit);
    }
    
    // Verifica se há stakes manuais (qualquer valor definido ativa modo manual)
    const hasManualStakes = betInputs.some(bet => bet.manualStake !== undefined && bet.manualStake !== null);
    
    if (hasManualStakes) {
      // Modo manual: calcula com stakes fornecidos
      const manualStakes = betInputs.map(bet => bet.manualStake || 0);
      const totalManual = manualStakes.reduce((sum, stake) => sum + stake, 0);
      
      const returnsGross = manualStakes.map((stake, i) => stake * odds[i]);
      const returnsNet = returnsGross.map((ret, i) => ret * (1 - fees[i] / 100));
      const minReturn = Math.min(...returnsNet);
      const profit = minReturn - totalManual;
      const roi = (profit / totalManual) * 100;
      
      return {
        ok: true,
        isManual: true,
        stakes: manualStakes,
        totalInvestido: totalManual,
        returnsBrutos: returnsGross,
        returnsLiquidos: returnsNet,
        menorRetorno: minReturn,
        lucro: profit,
        roi,
        odds,
        S: odds.reduce((acc, o) => acc + 1/o, 0)
      };
    } else {
      // Modo automático: usa a biblioteca, ignorando checagem de surebet
      return allocateStakes({
        odds,
        total: totalToUse,
        fees,
        minStake: minStakes,
        maxStake: maxStakes,
        skipSurebetCheck: true
      });
    }
  }, [betInputs, totalInvestment, desiredProfit, useDesiredProfit]);

  // Verificação de cobertura de cenários
  const coverageAnalysis = useMemo(() => {
    const scenarios = buildREScenarios();
    const markets = customMarkets.map(m => ({
      name: m.name,
      covers: new Set(m.scenarios)
    }));
    
    return checkCoverage(scenarios, markets);
  }, [customMarkets]);

  // ROI teórico
  const theoreticalROI = useMemo(() => {
    const odds = betInputs.map(bet => bet.odd);
    return calculateTheoreticalROI(odds);
  }, [betInputs]);

  const handleAddBetInput = () => {
    const newId = (betInputs.length + 1).toString();
    setBetInputs([...betInputs, {
      id: newId,
      casa: `Casa ${newId}`,
      odd: 2.0,
      fee: 0
    }]);
  };

  const handleRemoveBetInput = (id: string) => {
    setBetInputs(betInputs.filter(bet => bet.id !== id));
  };

  const handleBetInputChange = (id: string, field: keyof BetInput, value: string | number | undefined) => {
    setBetInputs(betInputs.map(bet => 
      bet.id === id ? { ...bet, [field]: value } : bet
    ));
  };

  const handleAddCustomMarket = () => {
    setCustomMarkets([...customMarkets, {
      name: `Mercado ${customMarkets.length + 1}`,
      scenarios: []
    }]);
  };

  const handleUpdateMarket = (index: number, field: 'name' | 'scenarios', value: string | string[]) => {
    const updated = [...customMarkets];
    if (field === 'scenarios' && typeof value === 'string') {
      updated[index].scenarios = value.split(',').map(s => s.trim()).filter(s => s);
    } else {
      updated[index][field] = value as any;
    }
    setCustomMarkets(updated);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header compacto */}
      <div className="text-center space-y-2 py-4">
        <div className="flex items-center justify-center gap-2">
          <Calculator className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Calculadora Avançada de Surebet</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Biblioteca completa com matemática avançada, fees, limites e verificação de cobertura de cenários
        </p>
      </div>

      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
          <TabsTrigger value="calculator" className="text-sm">Calculadora</TabsTrigger>
          <TabsTrigger value="scenarios" className="text-sm">Cenários</TabsTrigger>
          <TabsTrigger value="analysis" className="text-sm">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4">
          {/* Configuração de Investimento - Compacta */}
          <Card className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Modo de Cálculo</Label>
                  <div className="flex gap-1">
                    <Button 
                      variant={!useDesiredProfit ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseDesiredProfit(false)}
                      className="text-xs px-3"
                    >
                      Total Fixo
                    </Button>
                    <Button 
                      variant={useDesiredProfit ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseDesiredProfit(true)}
                      className="text-xs px-3"
                    >
                      Lucro Desejado
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 max-w-xs">
                  {!useDesiredProfit ? (
                    <div className="space-y-2">
                      <Label htmlFor="total" className="text-sm font-medium">Total a Investir (R$)</Label>
                      <Input
                        id="total"
                        type="number"
                        step="0.01"
                        value={totalInvestment}
                        onChange={(e) => setTotalInvestment(Number(e.target.value))}
                        className="text-center font-medium"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="profit" className="text-sm font-medium">Lucro Desejado (R$)</Label>
                      <Input
                        id="profit"
                        type="number"
                        step="0.01"
                        value={desiredProfit}
                        onChange={(e) => setDesiredProfit(Number(e.target.value))}
                        className="text-center font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inputs das Casas - Layout Melhorado */}
          <div className="grid gap-3">
            {betInputs.map((bet, index) => (
              <Card key={bet.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg text-blue-700">{bet.casa}</h3>
                    {betInputs.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBetInput(bet.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Inputs principais em grid responsivo */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Nome da Casa</Label>
                      <Input
                        value={bet.casa}
                        onChange={(e) => handleBetInputChange(bet.id, 'casa', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Odd</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bet.odd}
                        onChange={(e) => handleBetInputChange(bet.id, 'odd', Number(e.target.value))}
                        className="h-9 text-sm font-medium text-center"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Taxa/Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={bet.fee}
                        onChange={(e) => handleBetInputChange(bet.id, 'fee', Number(e.target.value))}
                        className="h-9 text-sm text-center"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Stake Manual (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bet.manualStake ?? ''}
                        onChange={(e) => handleBetInputChange(bet.id, 'manualStake', e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder="Opcional"
                        className="h-9 text-sm text-center"
                      />
                    </div>
                  </div>
                  
                  {/* Limites em linha separada, mais compactos */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Stake Mínimo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bet.minStake ?? ''}
                        onChange={(e) => handleBetInputChange(bet.id, 'minStake', e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder="Opcional"
                        className="h-8 text-xs text-center"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Stake Máximo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bet.maxStake ?? ''}
                        onChange={(e) => handleBetInputChange(bet.id, 'maxStake', e.target.value === '' ? undefined : Number(e.target.value))}
                        placeholder="Opcional"
                        className="h-8 text-xs text-center"
                      />
                    </div>
                  </div>
                  
                  {/* Resultados em cards pequenos */}
                  {calculation.ok && calculation.stakes && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="bg-gradient-to-r from-blue-100/50 to-blue-200/50 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-2 text-center border border-blue-300 dark:border-blue-700">
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-1 font-medium">Stake Sugerido</p>
                        <p className="font-bold text-sm text-blue-800 dark:text-blue-200">R$ {calculation.stakes[index]?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="bg-gradient-to-r from-slate-100/50 to-slate-200/50 dark:from-slate-800/30 dark:to-slate-700/30 dark:border-slate-600">
                        <p className="text-xs text-slate-700 dark:text-slate-300 mb-1 font-medium">Retorno Bruto</p>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">R$ {calculation.returnsBrutos?.[index]?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div className="bg-gradient-to-r from-green-100/50 to-emerald-200/50 dark:from-green-900/30 dark:to-emerald-800/30 rounded-lg p-2 text-center border border-green-300 dark:border-green-700">
                        <p className="text-xs text-green-700 dark:text-green-300 mb-1 font-medium">Retorno Líquido</p>
                        <p className="font-bold text-sm text-green-800 dark:text-green-200">R$ {calculation.returnsLiquidos?.[index]?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            <Button onClick={handleAddBetInput} variant="outline" className="w-full h-10">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Casa
            </Button>
          </div>

          {/* Resultados - Design Melhorado */}
          {calculation.ok ? (
            <div className="space-y-4">
              {/* Resultado (sem avaliar surebet): mostra porcentagem positiva/negativa */}
              <Card className={`border-2 ${Number(calculation.roi) >= 0 ? 'border-green-500 bg-gradient-to-r from-green-100/50 to-emerald-200/50 dark:from-green-900/30 dark:to-emerald-800/30' : 'border-red-500 bg-gradient-to-r from-red-100/50 to-rose-200/50 dark:from-red-900/30 dark:to-rose-800/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${Number(calculation.roi) >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                        <TrendingUp className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">
                          {Number(calculation.roi) >= 0 ? 'ROI Positivo' : 'ROI Negativo'}
                        </h3>
                        <div className="text-sm text-muted-foreground">
                          ROI Real: <strong>{calculation.roi?.toFixed(2)}%</strong>
                          {calculation.ok && 'isManual' in calculation && calculation.isManual && <Badge variant="secondary" className="ml-2">Modo Manual</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas Principais */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs opacity-90 mb-1">Total Investido</p>
                    <p className="text-xl font-bold">R$ {calculation.totalInvestido?.toFixed(2)}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs opacity-90 mb-1">Menor Retorno</p>
                    <p className="text-xl font-bold">R$ {calculation.menorRetorno?.toFixed(2)}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs opacity-90 mb-1">Lucro Garantido</p>
                    <p className="text-xl font-bold">R$ {calculation.lucro?.toFixed(2)}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs opacity-90 mb-1">ROI Real</p>
                    <p className="text-xl font-bold">{calculation.roi?.toFixed(2)}%</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Comparação ROI */}
              <Card className="bg-gradient-to-r from-slate-100/50 to-slate-200/50 border-slate-300 dark:from-slate-800/30 dark:to-slate-700/30 dark:border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-6">
                      <span>ROI Teórico: <strong className="text-blue-700 dark:text-blue-300">{theoreticalROI.toFixed(2)}%</strong></span>
                      <span>ROI Real: <strong className="text-green-700 dark:text-green-300">{calculation.roi?.toFixed(2)}%</strong></span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                      Diferença: {(theoreticalROI - (calculation.roi || 0)).toFixed(2)}% (fees + arredondamentos)
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Alert className="border-red-400 bg-gradient-to-r from-red-100/50 to-red-200/50 dark:from-red-900/30 dark:to-red-800/30">
              <AlertTriangle className="h-4 w-4 text-red-700 dark:text-red-300" />
              <AlertDescription className="text-red-900 dark:text-red-100">
                {(!calculation.ok && 'reason' in calculation && calculation.reason) || 'Não foi possível calcular a surebet'}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          {/* Status da Cobertura - Destaque */}
          <Card className={`border-2 ${coverageAnalysis.allCovered ? 'border-green-500 bg-gradient-to-r from-green-100/50 to-green-200/50 dark:from-green-900/30 dark:to-green-800/30' : 'border-orange-500 bg-gradient-to-r from-orange-100/50 to-orange-200/50 dark:from-orange-900/30 dark:to-orange-800/30'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${coverageAnalysis.allCovered ? 'bg-green-500' : 'bg-orange-500'}`}>
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {coverageAnalysis.allCovered ? '✅ Cobertura Completa!' : '⚠️ Cobertura Incompleta'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {coverageAnalysis.allCovered 
                      ? 'Todos os cenários estão cobertos pelos mercados configurados'
                      : `${coverageAnalysis.uncovered.length} cenários descobertos: ${coverageAnalysis.uncovered.join(', ')}`
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Mercados Configurados */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mercados Configurados</CardTitle>
                  <Button onClick={handleAddCustomMarket} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {customMarkets.map((market, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-3 space-y-2">
                      <Input
                        value={market.name}
                        onChange={(e) => handleUpdateMarket(index, 'name', e.target.value)}
                        placeholder="Nome do mercado"
                        className="h-8 text-sm font-medium"
                      />
                      <Input
                        value={market.scenarios.join(', ')}
                        onChange={(e) => handleUpdateMarket(index, 'scenarios', e.target.value)}
                        placeholder="Cenários cobertos (ex: A-A, EMP-B, B-EMP)"
                        className="h-8 text-xs"
                      />
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
            
            {/* Mapa de Cenários */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Mapa de Cenários</CardTitle>
                <CardDescription className="text-sm">Resultado × Escanteios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-1 text-xs">
                  <div className="p-2 bg-gray-700 text-white font-bold text-center rounded-tl">Resultado \ Esc</div>
                  <div className="p-2 bg-gray-600 text-white font-bold text-center">A</div>
                  <div className="p-2 bg-gray-600 text-white font-bold text-center">B</div>
                  <div className="p-2 bg-gray-600 text-white font-bold text-center rounded-tr">EMP</div>
                  
                  {['A', 'EMP', 'B'].map((resultado, rowIndex) => (
                    <React.Fragment key={resultado}>
                      <div className={`p-2 bg-gray-600 text-white font-bold text-center ${rowIndex === 2 ? 'rounded-bl' : ''}`}>
                        {resultado}
                      </div>
                      {['A', 'B', 'EMP'].map((escanteio, colIndex) => {
                        const scenario = `${resultado}-${escanteio}`;
                        const isCovered = !coverageAnalysis.uncovered.includes(scenario);
                        return (
                          <div 
                            key={`${resultado}-${escanteio}`}
                            className={`p-2 text-center border font-medium transition-colors ${
                              isCovered 
                                ? 'bg-green-100/50 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700' 
                                : 'bg-red-100/50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700'
                            } ${rowIndex === 2 && colIndex === 2 ? 'rounded-br' : ''}`}
                          >
                            {scenario}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Fórmulas Matemáticas */}
            <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Calculator className="h-5 w-5" />
                  Fórmulas Matemáticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                   <div className="bg-gradient-to-r from-blue-100/50 to-blue-200/50 dark:from-blue-900/30 dark:to-blue-800/30 p-3 rounded border border-blue-300 dark:border-blue-700">
                     <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Checagem de Arbitragem</p>
                     <code className="text-xs bg-blue-200/50 dark:bg-blue-800/50 px-2 py-1 rounded text-blue-900 dark:text-blue-100">S = Σ(1/odd_i)</code>
                     <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Se S &lt; 1 → surebet detectada</p>
                   </div>
                   
                   <div className="bg-gradient-to-r from-indigo-100/50 to-indigo-200/50 dark:from-indigo-900/30 dark:to-indigo-800/30 p-3 rounded border border-indigo-300 dark:border-indigo-700">
                     <p className="font-medium text-indigo-900 dark:text-indigo-100 mb-1">Alocação de Stakes</p>
                     <code className="text-xs bg-indigo-200/50 dark:bg-indigo-800/50 px-2 py-1 rounded text-indigo-900 dark:text-indigo-100">stake_i = (T/odd_i)/S</code>
                     <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">T = total investido</p>
                   </div>
                   
                   <div className="bg-gradient-to-r from-purple-100/50 to-purple-200/50 dark:from-purple-900/30 dark:to-purple-800/30 p-3 rounded border border-purple-300 dark:border-purple-700">
                     <p className="font-medium text-purple-900 dark:text-purple-100 mb-1">Retorno e Lucro</p>
                     <code className="text-xs bg-purple-200/50 dark:bg-purple-800/50 px-2 py-1 rounded block mb-1 text-purple-900 dark:text-purple-100">R = T/S</code>
                     <code className="text-xs bg-purple-200/50 dark:bg-purple-800/50 px-2 py-1 rounded block mb-1 text-purple-900 dark:text-purple-100">Lucro = R - T</code>
                     <code className="text-xs bg-purple-200/50 dark:bg-purple-800/50 px-2 py-1 rounded block text-purple-900 dark:text-purple-100">ROI = (Lucro/T) × 100</code>
                   </div>
                 </div>
              </CardContent>
            </Card>

            {/* Regras de Ouro */}
            <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <Shield className="h-5 w-5" />
                  Regras de Ouro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                   {[
                     'Sempre calcule S. Se ≥ 1, não é surebet',
                     'Arredonde stakes (2 casas) e recheque o menor retorno',
                     'Considere taxas/fee/câmbio nas casas',
                     'Evite mercados correlacionados na mesma casa',
                     'Atenção às regras de settlement (void, tempo extra)',
                     'Cheque limites min/máx por casa'
                   ].map((rule, index) => (
                     <div key={index} className="flex items-start gap-2 bg-gradient-to-r from-amber-100/50 to-orange-100/50 dark:from-amber-900/30 dark:to-orange-900/30 p-2 rounded border border-amber-300 dark:border-amber-700">
                       <span className="text-amber-700 dark:text-amber-300 font-bold text-xs mt-0.5">{index + 1}.</span>
                       <span className="text-xs text-amber-800 dark:text-amber-200">{rule}</span>
                     </div>
                   ))}
                 </div>
              </CardContent>
            </Card>
          </div>

          {/* Funcionalidades Avançadas */}
          <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <TrendingUp className="h-5 w-5" />
                Funcionalidades Avançadas Implementadas
              </CardTitle>
              <CardDescription className="text-green-600 dark:text-green-400">
                Esta calculadora inclui todas as funcionalidades premium para análise profissional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { feature: 'Arredondamento inteligente com autoajuste', desc: 'Otimiza o menor retorno após arredondamento' },
                  { feature: 'Suporte a fees por casa', desc: 'Calcula retorno líquido considerando taxas' },
                  { feature: 'Limites mínimos e máximos por casa', desc: 'Respeita restrições de cada bookmaker' },
                  { feature: 'Stakes manuais com recálculo automático', desc: 'Permite override manual com análise instantânea' },
                  { feature: 'Verificação de cobertura de cenários', desc: 'Garante que todos os resultados estão cobertos' },
                  { feature: 'Cálculo por lucro desejado', desc: 'Determina investimento necessário para lucro alvo' },
                  { feature: 'Otimização do menor retorno', desc: 'Maximiza o pior cenário possível' },
                  { feature: 'Análise de ROI teórico vs real', desc: 'Compara performance ideal vs prática' }
                ].map((item, index) => (
                   <div key={index} className="bg-gradient-to-r from-green-100/70 to-emerald-100/70 p-3 rounded border border-green-300 dark:border-green-700">
                     <div className="flex items-start gap-2">
                       <span className="text-green-600 dark:text-green-400 text-lg">✅</span>
                       <div>
                         <p className="font-medium text-sm text-green-900 dark:text-green-100">{item.feature}</p>
                         <p className="text-xs text-green-800 dark:text-green-300 mt-1">{item.desc}</p>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdvancedSurebetCalculator;

    