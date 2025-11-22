import { appRoute } from '@genkit-ai/next';
import { suggestImprovementsFlow } from '@/ai/flows/suggest-improvements';
import { generateBettingInsightsFlow } from '@/ai/flows/generate-betting-insights';
import { NextRequest } from 'next/server';

export function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith('/suggestImprovementsFlow')) {
    return appRoute(suggestImprovementsFlow)(req);
  }
  if (url.pathname.endsWith('/generateBettingInsightsFlow')) {
    return appRoute(generateBettingInsightsFlow)(req);
  }
  return new Response('Not Found', { status: 404 });
}
