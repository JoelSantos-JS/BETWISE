"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

export function TradingCalculator() {
  const [backOdd, setBackOdd] = React.useState("2.5")
  const [backStake, setBackStake] = React.useState("10")
  const [isFreebet, setIsFreebet] = React.useState(false)

  const [layOdd, setLayOdd] = React.useState("2.55")
  const [layCommission, setLayCommission] = React.useState("4.5")
  
  const [riskSlider, setRiskSlider] = React.useState([50])

  const calculatedValues = React.useMemo(() => {
    const bOdd = parseFloat(backOdd)
    const bStake = parseFloat(backStake)
    const lOdd = parseFloat(layOdd)
    const commission = parseFloat(layCommission) / 100
    const riskFactor = riskSlider[0] / 100;

    if (isNaN(bOdd) || isNaN(bStake) || isNaN(lOdd) || isNaN(commission) || bOdd <= 0 || bStake <= 0 || lOdd <= 0) {
      return { layStake: 0, liability: 0, profitIfBackWins: 0, profitIfLayWins: 0 }
    }

    // Se for freebet, o stake não é devolvido, então o lucro é Stake * (Odd - 1)
    const backProfit = isFreebet ? bStake * (bOdd - 1) : bStake * bOdd - bStake;

    // A lógica para o Lay Stake (Aposta Contra) é ajustar para igualar o lucro ou prejuízo
    // com base no resultado da aposta 'Back'.
    const layStake = (backProfit + bStake) / (lOdd - commission);
    
    // A 'Responsabilidade' (liability) é o que você arrisca na aposta Lay.
    const liability = layStake * (lOdd - 1);

    // Lucro se a aposta 'Back' (na Casa) ganhar
    const profitIfBackWins = backProfit - liability;

    // Lucro se a aposta 'Lay' (na Betfair) ganhar (o evento não acontece)
    // Você ganha o layStake, menos a comissão, e perde o backStake.
    const profitIfLayWins = layStake * (1 - commission) - bStake;

    return { layStake, liability, profitIfBackWins, profitIfLayWins }
  }, [backOdd, backStake, layOdd, layCommission, isFreebet, riskSlider])

  return (
    <Card className="bg-card/50 border-dashed">
         <CardHeader>
            <CardTitle className="text-xl">Calculadora de Trading (Back/Lay)</CardTitle>
            <CardDescription>Calcule os lucros e riscos para operações de trading esportivo.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6 p-6 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-4">
                    <span className="text-5xl font-bold text-muted-foreground opacity-50">1</span>
                    <h3 className="text-lg font-semibold">APOSTA A FAVOR (CASA DE APOSTAS)</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="back-odd">Odd</Label>
                        <Input id="back-odd" type="number" value={backOdd} onChange={(e) => setBackOdd(e.target.value)} placeholder="ex: 2.50" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="back-stake">Aposta (R$)</Label>
                        <Input id="back-stake" type="number" value={backStake} onChange={(e) => setBackStake(e.target.value)} placeholder="ex: 10.00" />
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox id="freebet" checked={isFreebet} onCheckedChange={(checked) => setIsFreebet(!!checked)} />
                    <Label htmlFor="freebet" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        É uma Freebet (stake não devolvida)?
                    </Label>
                </div>
            </div>

            <div className="space-y-6 p-6 bg-muted/30 rounded-lg border">
                 <div className="flex items-center gap-4">
                    <span className="text-5xl font-bold text-muted-foreground opacity-50">2</span>
                    <h3 className="text-lg font-semibold">APOSTA CONTRA (EXCHANGE)</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="lay-odd">Odd Lay</Label>
                        <Input id="lay-odd" type="number" value={layOdd} onChange={(e) => setLayOdd(e.target.value)} placeholder="ex: 2.55" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="lay-commission">Comissão (%)</Label>
                        <Input id="lay-commission" type="number" value={layCommission} onChange={(e) => setLayCommission(e.target.value)} placeholder="ex: 4.5" />
                    </div>
                </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Aposta Contra (R$)</Label>
                        <Input value={calculatedValues.layStake.toFixed(2)} readOnly className="font-bold bg-secondary" />
                    </div>
                    <div className="space-y-2">
                        <Label>Saldo Necessário (Risco)</Label>
                        <Input value={calculatedValues.liability.toFixed(2)} readOnly className="font-bold bg-secondary" />
                    </div>
                </div>
                 {/*  A funcionalidade do slider de risco é mais complexa e será adicionada no futuro
                    <div className="space-y-2">
                        <Label>Gerir Risco</Label>
                        <Slider defaultValue={[50]} max={100} step={1} onValueChange={setRiskSlider} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Casa</span>
                            <span>Exchange</span>
                        </div>
                    </div> 
                 */}
            </div>

            <div className="lg:col-span-2 mt-4 p-6 bg-background rounded-lg border-2 border-primary/50">
                 <h3 className="text-lg font-semibold mb-4 text-center">LUCRO / PREJUÍZO POTENCIAL</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Se ganhar na Casa (Back vence)</p>
                        <p className={cn("text-2xl font-bold", calculatedValues.profitIfBackWins >= 0 ? "text-green-500" : "text-destructive")}>
                           {calculatedValues.profitIfBackWins.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                     <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Se ganhar na Exchange (Lay vence)</p>
                        <p className={cn("text-2xl font-bold", calculatedValues.profitIfLayWins >= 0 ? "text-green-500" : "text-destructive")}>
                           {calculatedValues.profitIfLayWins.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                 </div>
            </div>
        </CardContent>
    </Card>
  )
}
