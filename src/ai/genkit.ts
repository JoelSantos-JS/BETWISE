import {genkit, configureGenkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';
import {dotprompt} from '@genkit-ai/dotprompt';

configureGenkit({
  plugins: [
    firebase(),
    googleAI({
      apiVersion: ['v1beta'],
    }),
    dotprompt({
      promptDir: './src/prompts',
    }),
  ],
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const ai = genkit;
