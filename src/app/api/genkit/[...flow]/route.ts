import { suggestImprovementsFlow } from '@/ai/flows/suggest-improvements';
import { generateBettingInsightsFlow } from '@/ai/flows/generate-betting-insights';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith('/suggestImprovementsFlow')) {
    try {
      const body = await req.json();
      const result = await suggestImprovementsFlow({
        bettingDataSummary: body?.bettingDataSummary,
      });
      return Response.json(result);
    } catch (e: any) {
      return new Response(e?.message ?? 'Internal Server Error', { status: 500 });
    }
  }
  if (url.pathname.endsWith('/generateBettingInsightsFlow')) {
    try {
      const body = await req.json();
      const result = await generateBettingInsightsFlow({
        bettingData: body?.bettingData,
      });
      return Response.json(result);
    } catch (e: any) {
      return new Response(e?.message ?? 'Internal Server Error', { status: 500 });
    }
  }
  return new Response('Not Found', { status: 404 });
}
