'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { PerformanceCharts } from '@/components/performance-charts';
import { BettingTable } from '@/components/betting-table';
import { useBets } from '@/context/bet-provider';
import { DollarSign, BarChart, Percent, TrendingUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SPORTS } from '@/lib/data';
import type { Sport, BetResult } from '@/lib/types';


export default function DashboardPage() {
  const { filteredBets, calculateStats, filters, setFilters } = useBets();
  const stats = calculateStats();

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={'outline'}
                className={cn(
                  'w-[300px] justify-start text-left font-normal',
                  !filters.dateRange && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, 'LLL dd, y')} -{' '}
                      {format(filters.date-range.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(filters.dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange?.from}
                selected={filters.dateRange}
                onSelect={(dateRange) => setFilters(f => ({...f, dateRange}))}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics" disabled>
            Analytics
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Profit/Loss
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {stats.totalProfit.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall performance
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Return on Investment (ROI)
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {stats.roi.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Efficiency of your stakes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.winRate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  From {stats.totalBets} settled bets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Staked
                </CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalStake.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {filteredBets.length} total bets
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Profit Over Time</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <PerformanceCharts bets={filteredBets} />
              </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Recent Bets</CardTitle>
                <CardDescription>
                  Your most recent {filteredBets.slice(0, 10).length} bets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BettingTable bets={filteredBets.slice(0, 10)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
