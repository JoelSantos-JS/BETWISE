'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBets } from '@/context/bet-provider';
import type { GenerateBettingInsightsOutput } from '@/ai/flows/generate-betting-insights';
import type { SuggestImprovementsOutput } from '@/ai/flows/suggest-improvements';
import { Sparkles, Bot } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export function AIInsights() {
  const { bets } = useBets();
  const [insights, setInsights] = useState<GenerateBettingInsightsOutput | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestImprovementsOutput | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInsights = async () => {
    setIsInsightsLoading(true);
    setError(null);
    setInsights(null);

    try {
      const response = await fetch('/api/genkit/generateBettingInsightsFlow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bettingData: JSON.stringify(bets) }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights. Please try again.');
      }
      const result = await response.json();
      setInsights(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsInsightsLoading(false);
    }
  };
  
  const handleSuggestImprovements = async () => {
    setIsSuggestionsLoading(true);
    setError(null);
    setSuggestions(null);

    try {
        const summary = `User has ${bets.length} bets. Recent bets include various sports and markets.`;
        const response = await fetch('/api/genkit/suggestImprovementsFlow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bettingDataSummary: summary }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate suggestions. Please try again.');
        }
        const result = await response.json();
        setSuggestions(result);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSuggestionsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
            <h3 className="text-xl font-semibold">Performance Analysis</h3>
            <p className="text-muted-foreground">Get an AI-driven summary of your betting habits, identifying strengths, weaknesses, and potential biases.</p>
            <Button onClick={handleGenerateInsights} disabled={isInsightsLoading}>
                {isInsightsLoading ? "Analyzing..." : "Generate Performance Insights"}
                <Sparkles className="ml-2 h-4 w-4" />
            </Button>
        </div>

        <Card className="min-h-[200px]">
            <CardHeader className="flex flex-row items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>Your Insights</CardTitle>
            </CardHeader>
            <CardContent>
                {isInsightsLoading && <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>}
                {error && <p className="text-destructive">{error}</p>}
                {insights && (
                    <p className="text-sm whitespace-pre-wrap">{insights.insights}</p>
                )}
                {!insights && !isInsightsLoading && <p className="text-sm text-muted-foreground">Click the button to generate your performance insights.</p>}
            </CardContent>
        </Card>

        <div className="space-y-4">
            <h3 className="text-xl font-semibold">Strategy Suggestions</h3>
            <p className="text-muted-foreground">Receive actionable recommendations to improve your betting strategy, from market selection to stake management.</p>
            <Button onClick={handleSuggestImprovements} disabled={isSuggestionsLoading}>
                {isSuggestionsLoading ? "Thinking..." : "Suggest Improvements"}
                <Bot className="ml-2 h-4 w-4" />
            </Button>
        </div>

        <Card className="min-h-[200px]">
            <CardHeader className="flex flex-row items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
                {isSuggestionsLoading && <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>}
                 {error && <p className="text-destructive">{error}</p>}
                {suggestions && (
                    <p className="text-sm whitespace-pre-wrap">{suggestions.suggestions}</p>
                )}
                {!suggestions && !isSuggestionsLoading && <p className="text-sm text-muted-foreground">Click the button to get AI-powered improvement suggestions.</p>}
            </CardContent>
        </Card>
    </div>
  );
}
