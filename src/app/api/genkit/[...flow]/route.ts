import { suggestImprovementsFlow } from '@/ai/flows/suggest-improvements';
import { generateBettingInsightsFlow } from '@/ai/flows/generate-betting-insights';
import { extractBetFromImageFlow } from '@/ai/flows/extract-bet-from-image';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith('/extractBetFromImageFlow')) {
    try {
      const body = await req.json();
      const result = await extractBetFromImageFlow({
        image: body?.image,
        bookmakers: body?.bookmakers,
        accounts: body?.accounts,
        apiKey: body?.apiKey,
        model: body?.model,
      });
      return Response.json(result);
    } catch (e: any) {
      return new Response(e?.message ?? 'Internal Server Error', { status: 500 });
    }
  }
  if (url.pathname.endsWith('/suggestImprovementsFlow')) {
    try {
      const body = await req.json();
      const result = await suggestImprovementsFlow({
        bettingDataSummary: body?.bettingDataSummary,
        apiKey: body?.apiKey,
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
        apiKey: body?.apiKey,
      });
      return Response.json(result);
    } catch (e: any) {
      return new Response(e?.message ?? 'Internal Server Error', { status: 500 });
    }
  }
  return new Response('Not Found', { status: 404 });
}
