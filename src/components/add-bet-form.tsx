'use client';

import React, { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useBets } from '@/context/bet-provider';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { SPORTS } from '@/lib/data';
import type { BetResult, Sport } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  date: z.date({
    required_error: 'A date for the bet is required.',
  }),
  sport: z.string({
    required_error: 'Please select a sport.',
  }),
  match: z.string().min(2, {
    message: 'Match name must be at least 2 characters.',
  }),
  market: z.string().min(2, {
    message: 'Market must be at least 2 characters.',
  }),
  selection: z.string().min(1, {
    message: 'Selection is required.',
  }),
  stake: z.coerce.number().min(0.01, {
    message: 'Stake must be a positive number.',
  }),
  odds: z.coerce.number().min(1.01, {
    message: 'Odds must be greater than 1.00.',
  }),
  result: z.enum(['won', 'lost', 'pending']),
});

export function AddBetForm() {
  const router = useRouter();
  const { addBet } = useBets();
  const { toast } = useToast();

  // Estado para a aba de Giros Grátis
  const [spins, setSpins] = useState<number>(10);
  const [spinValue, setSpinValue] = useState<number>(1.0);
  const [rtp, setRtp] = useState<number>(96.0); // %
  const [rollover, setRollover] = useState<number>(0); // x sobre ganhos
  const [contrib, setContrib] = useState<number>(100); // % contribuição para rollover
  const [taxRate, setTaxRate] = useState<number>(0); // % taxas/impostos

  const freeSpinsCalc = useMemo(() => {
    const nominal = Math.max(0, spins) * Math.max(0, spinValue);
    const r = Math.max(0, Math.min(100, rtp)) / 100; // 0..1
    const c = Math.max(1e-6, Math.max(1, rollover));
    const contribFactor = Math.max(1e-6, Math.max(0.01, contrib / 100)); // evita divisão por zero
    const tax = Math.max(0, Math.min(100, taxRate)) / 100;

    const expectedGross = nominal * r; // ganho esperado dos giros
    const wageringVolume = expectedGross * c / contribFactor; // volume necessário para limpar rollover
    const rolloverCost = wageringVolume * (1 - r); // custo esperado (edge da casa) para cumprir rollover
    const netBeforeTax = expectedGross - rolloverCost;
    const netAfterTax = netBeforeTax * (1 - tax);
    const yieldPct = nominal > 0 ? (netAfterTax / nominal) * 100 : (netAfterTax > 0 ? 100 : 0);

    return {
      nominal,
      expectedGross,
      wageringVolume,
      rolloverCost,
      netBeforeTax,
      netAfterTax,
      yieldPct,
      positive: netAfterTax >= 0
    };
  }, [spins, spinValue, rtp, rollover, contrib, taxRate]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      match: '',
      market: '',
      selection: '',
      stake: 10,
      odds: 2.0,
      result: 'pending',
      date: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    addBet({
      ...values,
      date: values.date.toISOString(),
      sport: values.sport as Sport,
      result: values.result as BetResult,
    });
    toast({
        title: "Bet added!",
        description: "Your bet has been successfully logged.",
        className: "bg-sidebar-accent border-sidebar-border"
    })
    router.push('/dashboard');
  }

  return (
    <Tabs defaultValue="bet" className="space-y-6">
      <TabsList className="w-full md:w-auto">
        <TabsTrigger value="bet">Adicionar Aposta</TabsTrigger>
        <TabsTrigger value="free-spins">Giros Grátis</TabsTrigger>
      </TabsList>

      <TabsContent value="bet">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="sport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sport</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a sport" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SPORTS.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Bet</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date('1900-01-01')
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="match"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Match / Event</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Real Madrid vs Barcelona" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FormField
            control={form.control}
            name="market"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Market</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Match Winner" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="selection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selection</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Real Madrid" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FormField
            control={form.control}
            name="stake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stake ($)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="10.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="odds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Odds (Decimal)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="2.50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Result</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a result" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" className="w-full md:w-auto">
            Add Bet
        </Button>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="free-spins" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Calculadora de Giros Grátis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Número de Giros</Label>
                <Input type="number" min={0} value={spins} onChange={(e) => setSpins(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Valor por Giro (R$)</Label>
                <Input type="number" step="0.01" min={0} value={spinValue} onChange={(e) => setSpinValue(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>RTP do Slot (%)</Label>
                <Input type="number" step="0.1" min={0} max={100} value={rtp} onChange={(e) => setRtp(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Rollover sobre ganhos (x)</Label>
                <Input type="number" step="1" min={0} value={rollover} onChange={(e) => setRollover(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Contribuição para rollover (%)</Label>
                <Input type="number" step="1" min={1} max={100} value={contrib} onChange={(e) => setContrib(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Taxas/Impostos (%)</Label>
                <Input type="number" step="0.1" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className={freeSpinsCalc.positive ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs opacity-90 mb-1">Lucro Estimado Líquido</p>
                  <p className="text-xl font-bold">R$ {freeSpinsCalc.netAfterTax.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-600 text-white">
                <CardContent className="p-4 text-center">
                  <p className="text-xs opacity-90 mb-1">Yield vs Valor Nominal</p>
                  <p className="text-xl font-bold">{freeSpinsCalc.yieldPct.toFixed(2)}%</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-600 text-white">
                <CardContent className="p-4 text-center">
                  <p className="text-xs opacity-90 mb-1">Ganho Esperado Bruto</p>
                  <p className="text-xl font-bold">R$ {freeSpinsCalc.expectedGross.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-600 text-white">
                <CardContent className="p-4 text-center">
                  <p className="text-xs opacity-90 mb-1">Custo p/ Rollover</p>
                  <p className="text-xl font-bold">R$ {freeSpinsCalc.rolloverCost.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded border bg-muted/40">
                <p className="text-sm text-muted-foreground">Valor nominal dos giros</p>
                <p className="text-lg font-bold">R$ {freeSpinsCalc.nominal.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded border bg-muted/40">
                <p className="text-sm text-muted-foreground">Volume de rollover (estimado)</p>
                <p className="text-lg font-bold">R$ {freeSpinsCalc.wageringVolume.toFixed(2)}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Estimativa simplificada: usa RTP e supõe mesma vantagem da casa durante o rollover. Resultados reais podem variar por regras de bônus e jogo utilizado.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
