import { config } from 'dotenv';
config();
config({ path: '.env.local' });

import '@/ai/flows/generate-betting-insights.ts';
import '@/ai/flows/suggest-improvements.ts';
import '@/ai/flows/extract-bet-from-image.ts';