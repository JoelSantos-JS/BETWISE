"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FreebetCondition = "win" | "loss";

interface CalculatorLeg {
  id: string;
  bookmaker: string;
  amount: number;
  oddBack: number;
  isLay: boolean;
  oddLay: number;
  commission: number;
  createsFreebet: boolean;
  freebetValue: number;
  freebetCondition: FreebetCondition;
}

interface ScenarioResult {
  legId: string;
  bookmaker: string;
  returnValue: number;
  freebetCredit: number;
  profit: number;
}

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const truncate3 = (value: number) => Math.trunc(value * 1000) / 1000;
const formatMoney = (value: number) => moneyFormatter.format(Number.isFinite(value) ? value : 0);
const formatPercent = (value: number) => `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`;

function layToBackOdd(oddLay: number, commission = 0) {
  if (oddLay <= 1 || !Number.isFinite(oddLay)) return 0;
  const commissionDecimal = Math.min(Math.max(commission, 0), 100) / 100;
  return truncate3((oddLay - commissionDecimal) / (oddLay - 1));
}

function getEffectiveOdd(leg: CalculatorLeg) {
  if (leg.isLay) return layToBackOdd(leg.oddLay, leg.commission);
  if (leg.oddBack <= 1 || !Number.isFinite(leg.oddBack)) return 0;
  return leg.oddBack;
}

function getLegReturn(leg: CalculatorLeg) {
  return round2(leg.amount * getEffectiveOdd(leg));
}

function calculateAutoAmounts(legs: CalculatorLeg[], totalInvestment: number) {
  const effectiveOdds = legs.map(getEffectiveOdd);
  if (totalInvestment <= 0 || effectiveOdds.some((odd) => odd <= 1)) return null;

  const inverseSum = effectiveOdds.reduce((sum, odd) => sum + 1 / odd, 0);
  if (inverseSum <= 0) return null;

  const rawAmounts = effectiveOdds.map((odd) => totalInvestment / (odd * inverseSum));
  const amounts = rawAmounts.map(round2);
  const diff = round2(totalInvestment - amounts.reduce((sum, amount) => sum + amount, 0));
  amounts[amounts.length - 1] = round2(amounts[amounts.length - 1] + diff);

  return amounts;
}

const createLeg = (index: number): CalculatorLeg => ({
  id: `leg-${index}`,
  bookmaker: `Casa ${index}`,
  amount: 0,
  oddBack: index === 1 ? 3 : index === 2 ? 3.5 : 3.9,
  isLay: false,
  oddLay: 0,
  commission: 0,
  createsFreebet: false,
  freebetValue: 0,
  freebetCondition: "loss",
});

export function AdvancedSurebetCalculator() {
  const [legs, setLegs] = useState<CalculatorLeg[]>([createLeg(1), createLeg(2), createLeg(3)]);
  const [calculationMode, setCalculationMode] = useState<"auto" | "manual">("auto");
  const [totalInvestment, setTotalInvestment] = useState(200);

  const calculatedLegs = useMemo(() => {
    if (calculationMode === "manual") return legs;

    const amounts = calculateAutoAmounts(legs, totalInvestment);
    if (!amounts) return legs;

    return legs.map((leg, index) => ({
      ...leg,
      amount: amounts[index] ?? 0,
    }));
  }, [calculationMode, legs, totalInvestment]);

  const result = useMemo(() => {
    const validLegs = calculatedLegs.filter((leg) => getEffectiveOdd(leg) > 1 && leg.amount > 0);
    const total = round2(validLegs.reduce((sum, leg) => sum + leg.amount, 0));
    const inverseSum = validLegs.reduce((sum, leg) => sum + 1 / getEffectiveOdd(leg), 0);

    const scenarios: ScenarioResult[] = validLegs.map((winner) => {
      const returnValue = getLegReturn(winner);
      const freebetCredit = validLegs.reduce((sum, leg) => {
        if (!leg.createsFreebet || leg.freebetValue <= 0) return sum;
        const conditionWasMet =
          (leg.freebetCondition === "win" && leg.id === winner.id) ||
          (leg.freebetCondition === "loss" && leg.id !== winner.id);
        return conditionWasMet ? sum + leg.freebetValue : sum;
      }, 0);

      return {
        legId: winner.id,
        bookmaker: winner.bookmaker,
        returnValue,
        freebetCredit: round2(freebetCredit),
        profit: round2(returnValue + freebetCredit - total),
      };
    });

    const minProfit = scenarios.length ? Math.min(...scenarios.map((scenario) => scenario.profit)) : 0;
    const maxProfit = scenarios.length ? Math.max(...scenarios.map((scenario) => scenario.profit)) : 0;
    const minReturn = scenarios.length ? Math.min(...scenarios.map((scenario) => scenario.returnValue + scenario.freebetCredit)) : 0;
    const roi = total > 0 ? round2((minProfit / total) * 100) : 0;

    return {
      total,
      inverseSum,
      isSurebet: inverseSum > 0 && inverseSum < 1,
      scenarios,
      minProfit: round2(minProfit),
      maxProfit: round2(maxProfit),
      minReturn: round2(minReturn),
      roi,
    };
  }, [calculatedLegs]);

  const updateLeg = <K extends keyof CalculatorLeg>(id: string, field: K, value: CalculatorLeg[K]) => {
    setLegs((current) =>
      current.map((leg) => {
        if (leg.id !== id) return leg;

        if (field === "isLay") {
          const isLay = Boolean(value);
          const nextLayOdd = isLay ? leg.oddLay : 0;
          const nextCommission = isLay ? leg.commission : 0;
          return {
            ...leg,
            isLay,
            oddLay: nextLayOdd,
            commission: nextCommission,
            oddBack: isLay && nextLayOdd > 1 ? layToBackOdd(nextLayOdd, nextCommission) : leg.oddBack,
          };
        }

        if (field === "oddLay") {
          const oddLay = Number(value);
          return {
            ...leg,
            oddLay,
            oddBack: oddLay > 1 ? layToBackOdd(oddLay, leg.commission) : leg.oddBack,
          };
        }

        if (field === "commission") {
          const commission = Number(value);
          return {
            ...leg,
            commission,
            oddBack: leg.isLay && leg.oddLay > 1 ? layToBackOdd(leg.oddLay, commission) : leg.oddBack,
          };
        }

        if (field === "oddBack") {
          return {
            ...leg,
            oddBack: Number(value),
            oddLay: 0,
            isLay: false,
            commission: 0,
          };
        }

        return { ...leg, [field]: value };
      })
    );
  };

  const addLeg = () => {
    if (legs.length >= 3) return;
    setLegs((current) => {
      const usedIndexes = new Set(current.map((leg) => Number(leg.id.replace("leg-", ""))));
      const nextIndex = [1, 2, 3].find((index) => !usedIndexes.has(index)) ?? current.length + 1;
      return [...current, createLeg(nextIndex)];
    });
  };

  const removeLeg = (id: string) => {
    if (legs.length <= 2) return;
    setLegs((current) => current.filter((leg) => leg.id !== id));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="grid gap-4 p-4 md:grid-cols-[auto_220px_auto] md:items-end">
              <div className="space-y-2">
                <Label>Modo de calculo</Label>
                <div className="flex rounded-md border border-border p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={calculationMode === "auto" ? "default" : "ghost"}
                    onClick={() => setCalculationMode("auto")}
                  >
                    Auto
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={calculationMode === "manual" ? "default" : "ghost"}
                    onClick={() => setCalculationMode("manual")}
                  >
                    Manual
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total-investment">Investimento total</Label>
                <Input
                  id="total-investment"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalInvestment}
                  disabled={calculationMode === "manual"}
                  onChange={(event) => setTotalInvestment(Number(event.target.value))}
                  className="text-right font-semibold"
                />
              </div>

              <Button type="button" variant="outline" onClick={addLeg} disabled={legs.length >= 3}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar casa
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {calculatedLegs.map((leg, index) => {
              const scenario = result.scenarios.find((item) => item.legId === leg.id);
              
              return (
              <Card key={leg.id} className="overflow-hidden border-l-4 border-l-primary">
                <CardHeader className="flex-row items-center justify-between space-y-0 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{leg.bookmaker || `Casa ${index + 1}`}</CardTitle>
                    {leg.isLay && <Badge variant="secondary">LAY</Badge>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeLeg(leg.id)}
                    disabled={legs.length <= 2}
                    aria-label="Remover casa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4 px-4 pb-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor={`bookmaker-${leg.id}`}>Casa</Label>
                      <Input
                        id={`bookmaker-${leg.id}`}
                        value={leg.bookmaker}
                        onChange={(event) => updateLeg(leg.id, "bookmaker", event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`amount-${leg.id}`}>Valor R$</Label>
                      <Input
                        id={`amount-${leg.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={leg.amount}
                        disabled={calculationMode === "auto"}
                        onChange={(event) => updateLeg(leg.id, "amount", Number(event.target.value))}
                        className="text-right font-semibold"
                      />
                      {leg.isLay && <p className="text-xs text-amber-500">Use o valor do risco.</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`odd-back-${leg.id}`}>Odd Back</Label>
                      <Input
                        id={`odd-back-${leg.id}`}
                        type="number"
                        min="1"
                        step="0.001"
                        value={leg.oddBack}
                        disabled={leg.isLay}
                        onChange={(event) => updateLeg(leg.id, "oddBack", Number(event.target.value))}
                        className="text-right font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>LAY</Label>
                      <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
                        <Switch
                          checked={leg.isLay}
                          onCheckedChange={(checked) => updateLeg(leg.id, "isLay", checked)}
                          aria-label="Alternar LAY"
                        />
                        <span className="text-sm font-medium">{leg.isLay ? "Ativo" : "Inativo"}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Odd efetiva</Label>
                      <div className="flex h-10 items-center justify-end rounded-md border border-input px-3 font-semibold">
                        {getEffectiveOdd(leg).toFixed(3)}
                      </div>
                    </div>
                  </div>

                  {leg.isLay && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`odd-lay-${leg.id}`}>Odd Lay</Label>
                        <Input
                          id={`odd-lay-${leg.id}`}
                          type="number"
                          min="1"
                          step="0.001"
                          value={leg.oddLay}
                          onChange={(event) => updateLeg(leg.id, "oddLay", Number(event.target.value))}
                          className="text-right font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`commission-${leg.id}`}>Comissao %</Label>
                        <Input
                          id={`commission-${leg.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={leg.commission}
                          onChange={(event) => updateLeg(leg.id, "commission", Number(event.target.value))}
                          className="text-right font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-[160px_1fr_180px]">
                    <div className="space-y-2">
                      <Label>Gera freebet</Label>
                      <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
                        <Switch
                          checked={leg.createsFreebet}
                          onCheckedChange={(checked) => updateLeg(leg.id, "createsFreebet", checked)}
                          aria-label="Alternar freebet"
                        />
                        <span className="text-sm font-medium">{leg.createsFreebet ? "Sim" : "Nao"}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`freebet-value-${leg.id}`}>Valor Freebet</Label>
                      <Input
                        id={`freebet-value-${leg.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={leg.freebetValue}
                        disabled={!leg.createsFreebet}
                        onChange={(event) => updateLeg(leg.id, "freebetValue", Number(event.target.value))}
                        className="text-right font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Ganha ao</Label>
                      <Select
                        value={leg.freebetCondition}
                        disabled={!leg.createsFreebet}
                        onValueChange={(value: FreebetCondition) => updateLeg(leg.id, "freebetCondition", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="loss">Perder</SelectItem>
                          <SelectItem value="win">Ganhar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-3">
                    <Metric label={leg.isLay ? "Risco sugerido" : "Stake sugerida"} value={formatMoney(leg.amount)} />
                    <Metric label="Retorno liquido" value={formatMoney(getLegReturn(leg))} />
                    <Metric label="Lucro no cenario" value={formatMoney(scenario?.profit ?? 0)} />
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className={cn("border-2", result.minProfit >= 0 ? "border-green-500" : "border-red-500")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {result.minProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Lucro garantido</p>
                <p className={cn("text-3xl font-bold", result.minProfit >= 0 ? "text-green-500" : "text-red-500")}>
                  {formatMoney(result.minProfit)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="ROI" value={formatPercent(result.roi)} />
                <Metric label="Investido" value={formatMoney(result.total)} />
                <Metric label="Menor retorno" value={formatMoney(result.minReturn)} />
                <Metric label="Maior lucro" value={formatMoney(result.maxProfit)} />
              </div>
              <Badge variant={result.isSurebet ? "default" : "secondary"} className="w-full justify-center">
                {result.isSurebet ? "Surebet" : "Nao e surebet"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CircleDollarSign className="h-5 w-5 text-primary" />
                Cenarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.scenarios.map((scenario) => (
                <div key={scenario.legId} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{scenario.bookmaker}</span>
                    <span className={cn("font-bold", scenario.profit >= 0 ? "text-green-500" : "text-red-500")}>
                      {formatMoney(scenario.profit)}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Retorno: {formatMoney(scenario.returnValue)}</span>
                    <span>Freebet: {formatMoney(scenario.freebetCredit)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {result.scenarios.length < 2 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Preencha pelo menos duas odds validas para calcular.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
