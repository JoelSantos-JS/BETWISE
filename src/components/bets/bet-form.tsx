"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck, Trash2, PlusCircle, Star, Target, Gift } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import React, { useEffect, useState } from 'react';

import type { Bet, Bookmaker, OutcomeScenario } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBets } from "@/context/bet-provider";
import { useToast } from "@/hooks/use-toast";
 


const subBetSchema = z.object({
  id: z.string().optional(),
  bookmaker: z.string().min(1, "Obrigatório"),
  betType: z.string().min(1, "Obrigatório"),
  odds: z.coerce.number().min(1.01, "Deve ser > 1.00"),
  stake: z.coerce.number().min(0.01, "Deve ser > 0"),
  isFreebet: z.boolean().optional(),
});

const baseBetSchema = z.object({
  sport: z.string().min(1, "O esporte é obrigatório."),
  event: z.string().min(3, "O evento deve ter pelo menos 3 caracteres."),
  date: z.date({ required_error: "A data da aposta é obrigatória." }),
  status: z.enum(['pending', 'won', 'lost', 'cashed_out', 'void']),
  notes: z.string().optional(),
  earnedFreebetValue: z.coerce.number().min(0, "O valor não pode ser negativo").optional().nullable(),
  realizedProfit: z.coerce.number().optional().nullable(),
  outcomeScenario: z.enum(['standard', 'double_green', 'pa_hedge']).optional().nullable(),
});

const singleBetSchema = baseBetSchema.extend({
  type: z.literal('single'),
  betType: z.string().min(3, "O tipo de aposta é obrigatório."),
  stake: z.coerce.number().min(0.01, "O valor apostado deve ser maior que zero."),
  odds: z.coerce.number().min(1.01, "As odds devem ser maiores que 1.00."),
  bookmaker: z.string().min(1, "A casa de apostas é obrigatória."),
});

const surebetSchema = baseBetSchema.extend({
  type: z.literal('surebet'),
  subBets: z.array(subBetSchema).min(2, "Uma surebet deve ter pelo menos 2 apostas."),
  totalStake: z.number().optional(),
  guaranteedProfit: z.number().optional(),
  profitPercentage: z.number().optional(),
});

const paSurebetSchema = baseBetSchema.extend({
  type: z.literal('pa_surebet'),
  subBets: z.array(subBetSchema).min(2, "Uma P.A. Surebet deve ter pelo menos 2 apostas."),
  totalStake: z.number().optional(),
  guaranteedProfit: z.number().optional(),
  profitPercentage: z.number().optional(),
});

const betSchema = z.discriminatedUnion("type", [
    singleBetSchema,
    surebetSchema,
    paSurebetSchema,
]);

const sportOptions = ["Futebol", "Basquete", "Tênis", "Vôlei", "Futebol Americano", "MMA", "E-Sports", "Outro"];
const statusOptions: Record<Bet['status'], string> = { pending: 'Pendente', won: 'Ganha', lost: 'Perdida', cashed_out: 'Cash Out', void: 'Anulada' };
const scenarioOptions: Record<OutcomeScenario, string> = { standard: 'Resultado Padrão', double_green: 'Duplo Green', pa_hedge: 'P.A. com Cobertura' };


interface BetFormProps {
  onSave: (bet: Omit<Bet, 'id'>) => void;
  betToEdit?: Bet | null;
  onCancel: () => void;
  bookmakers: Bookmaker[];
}

const calculateSurebet = (subBets: z.infer<typeof subBetSchema>[] | undefined) => {
    if (!subBets || subBets.length < 2) {
      return { totalStake: 0, guaranteedProfit: 0, profitPercentage: 0 };
    }

    // 1. Custo Real (Total Stake): Soma apenas as apostas com dinheiro real.
    const totalStake = subBets
      .filter(bet => !bet.isFreebet)
      .reduce((acc, bet) => acc + (bet.stake || 0), 0);

    if (totalStake <= 0 && !subBets.some(b => b.isFreebet)) {
        return { totalStake, guaranteedProfit: 0, profitPercentage: 0 };
    }
    
    // 2. Retornos Potenciais: Calcula o retorno líquido de cada "perna" da aposta.
    const potentialReturns = subBets.map(bet => {
        const stake = bet.stake || 0;
        const odds = bet.odds || 0;
        
        // Se esta perna ganhar, qual o retorno líquido?
        // Retorno Bruto - Custo Real Total
        const grossReturn = bet.isFreebet ? stake * (odds - 1) : stake * odds;
        
        return grossReturn - totalStake;
    });

    // 3. Lucro Garantido: É o pior cenário entre todos os retornos líquidos.
    const guaranteedProfit = Math.min(...potentialReturns);
    
    // 4. Retorno Percentual (ROI)
    const profitPercentage = totalStake > 0 ? (guaranteedProfit / totalStake) * 100 : Infinity;
  
    return { totalStake, guaranteedProfit, profitPercentage };
};

export function BetForm({ onSave, betToEdit, onCancel, bookmakers }: BetFormProps) {
  const [hedgeOdd, setHedgeOdd] = useState<number | null>(null);
  const [freeSpinsBookmaker, setFreeSpinsBookmaker] = useState<string>('');
  const [freeSpinsCount, setFreeSpinsCount] = useState<number>(0);
  const [freeSpinsEarned, setFreeSpinsEarned] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>(betToEdit ? (betToEdit.type || 'single') : 'single');
  const { addFreeSpin } = useBets();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof betSchema>>({
    resolver: zodResolver(betSchema),
    defaultValues: betToEdit ? (betToEdit.type === 'single' ? {
        type: 'single' as const,
        sport: betToEdit.sport,
        event: betToEdit.event,
        date: new Date(betToEdit.date),
        status: betToEdit.status,
        notes: betToEdit.notes,
        earnedFreebetValue: betToEdit.earnedFreebetValue || 0,
        realizedProfit: betToEdit.realizedProfit,
        betType: betToEdit.betType || '',
        stake: betToEdit.stake || 0,
        odds: betToEdit.odds || 1.01,
        bookmaker: betToEdit.bookmaker || '',
    } : {
        type: (betToEdit.type || 'surebet') as 'surebet' | 'pa_surebet',
        sport: betToEdit.sport,
        event: betToEdit.event,
        date: new Date(betToEdit.date),
        status: betToEdit.status,
        notes: betToEdit.notes,
        earnedFreebetValue: betToEdit.earnedFreebetValue || 0,
        realizedProfit: betToEdit.realizedProfit,
        subBets: betToEdit.subBets || [],
         totalStake: betToEdit.totalStake || undefined,
         guaranteedProfit: betToEdit.guaranteedProfit || undefined,
         profitPercentage: betToEdit.profitPercentage || undefined,
         outcomeScenario: betToEdit.outcomeScenario || 'standard',
    }) : {
        type: 'single',
        sport: "Futebol",
        event: "",
        betType: "",
        stake: 10,
        odds: 1.5,
        status: 'pending',
        date: new Date(),
        notes: "",
        earnedFreebetValue: 0,
        bookmaker: bookmakers.length > 0 ? bookmakers[0].name : '',
        outcomeScenario: 'standard',
    },
  });

  const { control, handleSubmit, watch, formState: { isSubmitting }, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "subBets" as never});

  const watchedType = watch("type");
  const watchedStatus = watch("status");
  const watchedSubBets = watch("subBets");
  const watchedOutcomeScenario = watch("outcomeScenario");
  
  useEffect(() => {
    setActiveTab(watchedType);
  }, [watchedType]);
  
  const surebetCalculations = React.useMemo(() => {
    if (watchedType !== 'surebet' && watchedType !== 'pa_surebet') return { totalStake: 0, guaranteedProfit: 0, profitPercentage: 0 };
    // @ts-ignore
    return calculateSurebet(watchedSubBets);
  }, [watchedType, watchedSubBets]);

  // Aba de Giros Grátis é informativa; mantemos apenas campos simples

useEffect(() => {
    if (betToEdit && watchedType === 'pa_surebet' && watchedStatus === 'won') {
        let profit = 0;
        const subBets = watchedSubBets || [];
        const getNetProfit = (stake: number, odds: number, isFreebet: boolean | undefined) => {
             return isFreebet ? stake * (odds - 1) : stake * (odds - 1);
        };

        if (watchedOutcomeScenario === 'double_green') {
            // No duplo green com pagamento antecipado, o ganho é o valor total apostado
            // pois você já recebeu o pagamento antecipado e não perdeu o valor apostado
            profit = subBets.reduce((acc, bet) => {
                return acc + bet.stake; // Ganho = valor apostado (já que houve pagamento antecipado)
            }, 0);
            profit = Math.round(profit * 100) / 100; // Arredondamento para 2 casas decimais

        } else if (watchedOutcomeScenario === 'pa_hedge' && hedgeOdd && hedgeOdd > 1) {
            // P.A. com Cobertura: 
            // Stake de cobertura = Total apostado / Odd de cobertura
            // Lucro = Total apostado - Stake de cobertura
            const totalStakeUsed = subBets.reduce((acc, bet) => acc + bet.stake, 0);
            const hedgeStake = totalStakeUsed / hedgeOdd;
            
            // Lucro final = Total apostado - Stake necessária para cobertura
            profit = totalStakeUsed - hedgeStake;
            profit = Math.round(profit * 100) / 100;

        } else { // standard
            profit = surebetCalculations.guaranteedProfit;
            profit = Math.round(profit * 100) / 100; // Arredondamento para 2 casas decimais
        }
        setValue('realizedProfit', profit);
    }
}, [watchedStatus, watchedType, watchedSubBets, watchedOutcomeScenario, hedgeOdd, setValue, surebetCalculations, betToEdit]);


  const onSubmit = (data: z.infer<typeof betSchema>) => {
    let finalData: Omit<Bet, 'id'> = JSON.parse(JSON.stringify(data));

    if ((finalData.type === 'surebet' || finalData.type === 'pa_surebet') && finalData.subBets) {
        const { totalStake, guaranteedProfit, profitPercentage } = calculateSurebet(finalData.subBets);
        finalData.totalStake = totalStake;
        finalData.guaranteedProfit = guaranteedProfit;
        finalData.profitPercentage = profitPercentage;
    }
    
    if(!finalData.earnedFreebetValue) {
        (finalData as any).earnedFreebetValue = null;
    }
    if(finalData.realizedProfit === undefined) {
        (finalData as any).realizedProfit = null;
    }
     if(!finalData.outcomeScenario) {
        (finalData as any).outcomeScenario = null;
    }

    onSave(finalData);
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'single' || value === 'surebet' || value === 'pa_surebet') {
      setValue('type', value as 'single' | 'surebet' | 'pa_surebet');
    }
  };

  const handleSaveFreeSpins = async () => {
    if (!freeSpinsBookmaker || freeSpinsCount <= 0 || freeSpinsEarned < 0) {
      toast({
        title: "Dados inválidos",
        description: "Preencha casa, quantidade (>=1) e valor (>=0).",
        className: "bg-sidebar-accent border-sidebar-border",
      });
      return;
    }
    await addFreeSpin({
      bookmaker: freeSpinsBookmaker,
      spinsCount: freeSpinsCount,
      wonAmount: freeSpinsEarned,
      date: new Date(),
    });
    toast({
      title: "Giros Grátis salvos",
      description: "Registro adicionado com sucesso.",
      className: "bg-sidebar-accent border-sidebar-border",
    });
    onCancel();
  };


  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      <DialogHeader className="p-6 pb-4">
        <DialogTitle>{betToEdit ? "Editar Aposta" : "Adicionar Nova Aposta"}</DialogTitle>
        <DialogDescription>
            {betToEdit ? "Ajuste os detalhes da sua aposta." : "Registre uma aposta simples ou uma surebet para acompanhar."}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 px-6 py-2">
                    
                    <Tabs defaultValue={activeTab} onValueChange={handleTabChange} className="w-full">
                        <TabsList className="flex w-full overflow-x-auto gap-2 sm:grid sm:grid-cols-4 sm:overflow-visible">
                            <TabsTrigger className="flex-shrink-0" value="single">Aposta Simples</TabsTrigger>
                            <TabsTrigger className="flex-shrink-0 flex items-center gap-2" value="surebet"><ShieldCheck className="w-4 h-4 text-teal-500"/> Surebet</TabsTrigger>
                             <TabsTrigger className="flex-shrink-0 flex items-center gap-2" value="pa_surebet"><Target className="w-4 h-4 text-orange-500"/> P.A. Surebet</TabsTrigger>
                             <TabsTrigger className="flex-shrink-0 flex items-center gap-2" value="free_spins"><Gift className="w-4 h-4 text-purple-500"/> Giros Grátis</TabsTrigger>
                        </TabsList>
                        
                        {activeTab !== 'free_spins' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <FormField control={control} name="sport" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Esporte</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="min-h-11"><SelectValue placeholder="Selecione o esporte" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {sportOptions.map((sport) => <SelectItem key={sport} value={sport}>{sport}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={control} name="event" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Evento</FormLabel>
                                    <FormControl><Input className="h-11" autoComplete="on" autoCapitalize="words" {...field} placeholder="Ex: Time A vs Time B" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        )}
                        
                        <TabsContent value="single" className="space-y-4 mt-4">
                            <FormField control={control} name="betType" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Aposta</FormLabel>
                                    <FormControl><Input className="h-11" autoComplete="on" autoCapitalize="sentences" {...field} placeholder="Ex: Vitória Time A" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={control} name="stake" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor Apostado (R$)</FormLabel>
                                        <FormControl><Input className="h-11" type="number" inputMode="decimal" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={control} name="odds" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Odds</FormLabel>
                                        <FormControl><Input className="h-11" type="number" inputMode="decimal" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                             <FormField control={control} name="bookmaker" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Casa de Apostas</FormLabel>
                                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="min-h-11"><SelectValue placeholder="Selecione a casa" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {bookmakers.map((bk) => <SelectItem key={bk.id} value={bk.name}>{bk.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={control} name="earnedFreebetValue" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ganha Freebet de (R$)? (Opcional)</FormLabel>
                                    <FormControl><Input className="h-11" type="number" inputMode="decimal" step="0.01" value={field.value || ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder="Valor da freebet que esta aposta qualifica" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>

                        <TabsContent value="free_spins" className="space-y-4 mt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Casa de Apostas</FormLabel>
                              <Select onValueChange={(v) => setFreeSpinsBookmaker(v)} defaultValue={freeSpinsBookmaker || (bookmakers[0]?.name || '')}>
                                <FormControl><SelectTrigger className="min-h-11"><SelectValue placeholder="Selecione a casa" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {bookmakers.map((bk) => <SelectItem key={bk.id} value={bk.name}>{bk.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <FormLabel>Quantidade de Giros</FormLabel>
                              <Input className="h-11" type="number" inputMode="numeric" min={1} step={1} value={freeSpinsCount} onChange={(e) => setFreeSpinsCount(Number(e.target.value))} placeholder="10" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <FormLabel>Valor Ganho (R$)</FormLabel>
                              <Input className="h-11" type="number" inputMode="decimal" step="0.01" value={freeSpinsEarned} onChange={(e) => setFreeSpinsEarned(Number(e.target.value))} placeholder="0.00" />
                            </div>
                          </div>
                          <div className="pt-2">
                            <Button type="button" className="w-full sm:w-auto" onClick={handleSaveFreeSpins}>
                              Salvar Giros Grátis
                            </Button>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="surebet" className="space-y-4 mt-4">
                             <h3 className="text-md font-medium mb-2">Apostas da Surebet</h3>
                            <div className="space-y-4">
                                {fields.map((item, index) => (
                                    <div key={item.id} className="p-4 bg-muted/50 rounded-lg space-y-3 relative">
                                        <FormField control={control} name={`subBets.${index}.bookmaker`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Casa de Apostas / Exchange</FormLabel>
                                                <FormControl><Input className="h-11" placeholder="Ex: Bet365 ou Betfair" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={control} name={`subBets.${index}.betType`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Aposta</FormLabel>
                                                <FormControl><Input className="h-11" placeholder="Ex: 'Vitória Time A' ou 'Lay Empate (contra)'" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField control={control} name={`subBets.${index}.odds`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Odds</FormLabel>
                                                    <FormControl><Input className="h-11" type="number" inputMode="decimal" step="0.01" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name={`subBets.${index}.stake`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Aposta (R$)</FormLabel>
                                                    <FormControl><Input className="h-11" type="number" inputMode="decimal" step="0.01" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                         <FormField
                                            control={control}
                                            name={`subBets.${index}.isFreebet`}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-4">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal flex items-center gap-1">
                                                        <Star className="w-4 h-4 text-yellow-500" /> É uma Aposta Grátis (Freebet)?
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                         {fields.length > 2 && (
                                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                         )}
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-4 w-full sm:w-auto" onClick={() => append({ id: new Date().toISOString() , bookmaker: '', betType: '', odds: 1.5, stake: 0, isFreebet: false })}>
                                <PlusCircle className="mr-2"/> Adicionar Aposta
                            </Button>
                             <FormField control={control} name="earnedFreebetValue" render={({ field }) => (
                                <FormItem className="pt-4">
                                    <FormLabel>Ganha Freebet de (R$)? (Opcional)</FormLabel>
                                    <FormControl><Input type="number" step="0.01" value={field.value || ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder="Valor da freebet que esta aposta qualifica" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>

                        <TabsContent value="pa_surebet" className="space-y-4 mt-4">
                             <h3 className="text-md font-medium mb-2">Apostas da P.A. Surebet</h3>
                            <div className="space-y-4">
                                {fields.map((item, index) => (
                                    <div key={item.id} className="p-4 bg-muted/50 rounded-lg space-y-3 relative">
                                        <FormField control={control} name={`subBets.${index}.bookmaker`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Casa de Apostas / Exchange</FormLabel>
                                                <FormControl><Input placeholder="Ex: Bet365 ou Betfair" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={control} name={`subBets.${index}.betType`} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Aposta</FormLabel>
                                                <FormControl><Input placeholder="Ex: 'Vitória Time A' ou 'Lay Empate (contra)'" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField control={control} name={`subBets.${index}.odds`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Odds</FormLabel>
                                                    <FormControl><Input className="h-11" type="number" inputMode="decimal" step="0.01" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={control} name={`subBets.${index}.stake`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Aposta (R$)</FormLabel>
                                                    <FormControl><Input className="h-11" type="number" inputMode="decimal" step="0.01" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </div>
                                         <FormField
                                            control={control}
                                            name={`subBets.${index}.isFreebet`}
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 mt-4">
                                                    <FormControl>
                                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                    </FormControl>
                                                    <FormLabel className="text-sm font-normal flex items-center gap-1">
                                                        <Star className="w-4 h-4 text-yellow-500" /> É uma Aposta Grátis (Freebet)?
                                                    </FormLabel>
                                                </FormItem>
                                            )}
                                        />
                                         {fields.length > 2 && (
                                            <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                         )}
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="outline" size="sm" className="mt-4 w-full sm:w-auto" onClick={() => append({ id: new Date().toISOString() , bookmaker: '', betType: '', odds: 1.5, stake: 0, isFreebet: false })}>
                                <PlusCircle className="mr-2"/> Adicionar Aposta
                            </Button>
                             <FormField control={control} name="earnedFreebetValue" render={({ field }) => (
                                <FormItem className="pt-4">
                                    <FormLabel>Ganha Freebet de (R$)? (Opcional)</FormLabel>
                                    <FormControl><Input type="number" step="0.01" value={field.value || ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} placeholder="Valor da freebet que esta aposta qualifica" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </TabsContent>
                    </Tabs>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger className="min-h-11"><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {Object.entries(statusOptions).map(([key, value]) => (
                                                <SelectItem key={key} value={key as Bet['status']}>{value}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col pt-2">
                                    <FormLabel>Data da Aposta</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("w-full justify-start pl-3 text-left font-normal min-h-11", !field.value && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR}/>
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    {betToEdit && watchedType === 'pa_surebet' && watchedStatus === 'won' && (
                        <div className="p-4 border-t mt-4 space-y-4 bg-orange-500/10 rounded-lg border-orange-500/30">
                            <FormField control={control} name="outcomeScenario" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cenário de Resolução</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'standard'}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o cenário" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {Object.entries(scenarioOptions).map(([key, value]) => (
                                                <SelectItem key={key} value={key as OutcomeScenario}>{value}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {watchedOutcomeScenario === 'pa_hedge' && (
                                <FormItem>
                                    <FormLabel>Odd da Cobertura (Hedge)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={hedgeOdd ?? ''}
                                            onChange={(e) => setHedgeOdd(e.target.value === '' ? null : Number(e.target.value))}
                                            placeholder="Ex: 1.31"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}

                            <FormField control={control} name="realizedProfit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lucro Final (R$)</FormLabel>
                                    <FormControl>
                                        <Input
                                            className="h-11"
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                                            placeholder="Lucro real calculado ou manual"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}


                     <FormField control={control} name="notes" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Análise / Notas (Opcional)</FormLabel>
                            <FormControl><Textarea className="min-h-24" {...field} placeholder="Ex: Jogador chave lesionado, time vem de 5 vitórias..." /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
            </ScrollArea>
             <DialogFooter className="p-6 pt-4 flex-col md:flex-row md:justify-between items-start md:items-center border-t gap-4">
                 {(watchedType === 'surebet' || watchedType === 'pa_surebet') && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 items-center text-sm">
                        <div>
                            <span className="text-muted-foreground">Total Apostado:</span>
                            <p className="font-bold">{surebetCalculations.totalStake.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        </div>
                         <div>
                            <span className="text-muted-foreground">Lucro Garantido:</span>
                            <p className={cn("font-bold", surebetCalculations.guaranteedProfit >= 0 ? "text-green-500" : "text-destructive")}>
                                {surebetCalculations.guaranteedProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                        </div>
                         <div>
                            <span className="text-muted-foreground">Retorno:</span>
                            <p className={cn("font-bold", surebetCalculations.profitPercentage >= 0 ? "text-green-500" : "text-destructive")}>
                                {isFinite(surebetCalculations.profitPercentage) ? `${surebetCalculations.profitPercentage.toFixed(2)}%` : 'N/A'}
                            </p>
                        </div>
                    </div>
                 )}
                <div className="flex gap-2 ml-auto w-full sm:w-auto">
                    <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
                    {activeTab === 'free_spins' ? (
                      <Button className="w-full sm:w-auto" type="button" onClick={handleSaveFreeSpins} disabled={isSubmitting}>
                        Salvar Giros Grátis
                      </Button>
                    ) : (
                      <Button className="w-full sm:w-auto" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : (betToEdit ? "Salvar Alterações" : "Adicionar Aposta")}
                      </Button>
                    )}
                </div>
            </DialogFooter>
        </form>
      </Form>
    </div>
  );
}
