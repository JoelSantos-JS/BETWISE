'use client';

import React, { useState } from 'react';
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
import type { Bet } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 

const formSchema = z.object({
  date: z.date({
    required_error: 'A date for the bet is required.',
  }),
  sport: z.string({
    required_error: 'Please select a sport.',
  }),
  event: z.string().min(2, {
    message: 'Event must be at least 2 characters.',
  }),
  betType: z.string().min(2, {
    message: 'Bet type must be at least 2 characters.',
  }),
  stake: z.coerce.number().min(0.01, {
    message: 'Stake must be a positive number.',
  }),
  odds: z.coerce.number().min(1.01, {
    message: 'Odds must be greater than 1.00.',
  }),
  status: z.enum(['pending', 'won', 'lost']),
});

export function AddBetForm() {
  const router = useRouter();
  const { addBet } = useBets();
  const { toast } = useToast();

  // Estado para a aba de Giros Grátis (simplificada)
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      event: '',
      betType: '',
      stake: 10,
      odds: 2.0,
      status: 'pending',
      date: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const newBet: Omit<Bet, 'id'> = {
      type: 'single',
      sport: values.sport,
      event: values.event,
      betType: values.betType,
      stake: values.stake,
      odds: values.odds,
      status: values.status,
      date: values.date,
    };
    addBet(newBet);
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
      </TabsList>

      <TabsContent value="bet">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="sport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sport</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="min-h-11">
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
                          'pl-3 text-left font-normal min-h-11',
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
          name="event"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Evento</FormLabel>
              <FormControl>
                <Input className="h-11" autoComplete="on" autoCapitalize="words" placeholder="Ex: Real Madrid vs Barcelona" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="betType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Aposta</FormLabel>
                <FormControl>
                  <Input className="h-11" autoComplete="on" autoCapitalize="sentences" placeholder="Ex: Match Winner / Over 2.5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <FormField
            control={form.control}
            name="stake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stake ($)</FormLabel>
                <FormControl>
                  <Input className="h-11" type="number" inputMode="decimal" step="0.01" placeholder="10.00" {...field} />
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
                  <Input className="h-11" type="number" inputMode="decimal" step="0.01" placeholder="2.50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="won">Ganha</SelectItem>
                    <SelectItem value="lost">Perdida</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" size="lg" className="w-full md:w-auto">
            Adicionar Aposta
        </Button>
          </form>
        </Form>
      </TabsContent>

      
    </Tabs>
  );
}
