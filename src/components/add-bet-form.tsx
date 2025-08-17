'use client';

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
  );
}
