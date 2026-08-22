'use server';

/**
 * @fileOverview Extrai dados de um comprovante de aposta (print/screenshot) usando Gemini,
 * preenchendo automaticamente os campos do formulario de aposta do BetWise.
 *
 * - extractBetFromImage - A function that extracts bet data from an image.
 * - ExtractBetFromImageInput - The input type for the extractBetFromImage function.
 * - ExtractBetFromImageOutput - The return type for the extractBetFromImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SPORT_OPTIONS = [
  'Futebol',
  'Basquete',
  'Tênis',
  'Vôlei',
  'Futebol Americano',
  'MMA',
  'E-Sports',
  'Outro',
] as const;

const ExtractedSubBetSchema = z.object({
  bookmaker: z
    .string()
    .nullable()
    .describe('Nome da casa/exchange desta perna, exatamente como informado na lista fornecida.'),
  betType: z.string().nullable().describe('Mercado/seleção apostada (ex: "Empate", "+2.5").'),
  odds: z.number().nullable().describe('Odds decimal desta perna (ex: 3.40).'),
  stake: z.number().nullable().describe('Valor apostado em R$ nesta perna.'),
  isFreebet: z
    .boolean()
    .describe('true se esta perna foi jogada com freebet (aposta gratuita).'),
  hasPa: z
    .boolean()
    .describe('true se esta casa tem pagamento antecipado (P.A.).'),
  accountName: z
    .string()
    .nullable()
    .describe('Nome da conta usada, exatamente como informado na lista de contas fornecida.'),
  accountCpf: z
    .string()
    .nullable()
    .describe('CPF da conta usada, exatamente como informado na lista de contas fornecida.'),
  cashbackValue: z
    .number()
    .nullable()
    .describe('Valor do cashback (em % ou R$) se informado no comprovante; caso contrário null.'),
  cashbackMode: z
    .enum(['percent', 'fixed'])
    .nullable()
    .describe('"fixed" se o cashback é um valor fixo em R$, "percent" se é percentual.'),
});

const ExtractBetFromImageInputSchema = z.object({
  image: z
    .string()
    .describe('Imagem do comprovante de aposta como data URI (ex: data:image/png;base64,...).'),
  bookmakers: z
    .array(z.string())
    .optional()
    .describe('Lista de nomes de casas de apostas cadastradas no sistema, para casar nomes.'),
  accounts: z
    .array(z.object({ name: z.string(), cpf: z.string() }))
    .optional()
    .describe('Lista de contas cadastradas (nome + CPF) para casar a conta usada.'),
  apiKey: z
    .string()
    .optional()
    .describe('Chave da API do Gemini configurada pelo usuario (sobrescreve a do ambiente).'),
  model: z
    .string()
    .optional()
    .describe('Modelo Gemini a usar (ex: googleai/gemini-2.5-flash). Padrão: gemini-2.5-flash.'),
});

const SUPPORTED_MODELS = [
  'googleai/gemini-2.5-flash',
  'googleai/gemini-2.5-flash-lite',
  'googleai/gemini-2.5-pro',
  'googleai/gemini-2.0-flash-lite',
] as const;

function isRateLimitError(message: string): boolean {
  return /429|RESOURCE_EXHAUSTED|too many requests|quota|RPD|RPM|TPM/i.test(message);
}

async function withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      const message = e?.message ?? String(e);
      if (!isRateLimitError(message) || attempt >= maxRetries) {
        throw new Error(
          isRateLimitError(message)
            ? 'Cota gratuita do Gemini esgotada (limite de requisições). Aguarde alguns minutos ou troque para o modelo flash-lite em Configurações.'
            : message
        );
      }
      attempt++;
      const delay = 1500 * 2 ** attempt + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
export type ExtractBetFromImageInput = z.infer<typeof ExtractBetFromImageInputSchema>;

const ExtractBetFromImageOutputSchema = z.object({
  type: z
    .enum(['single', 'surebet', 'pa_surebet'])
    .describe('"single" para aposta simples, "surebet" para surebet, "pa_surebet" para P.A. surebet.'),
  sport: z
    .string()
    .nullable()
    .describe(
      `Esporte normalizado, deve ser um destes: ${SPORT_OPTIONS.join(', ')}. Use "Outro" se não encaixar.`
    ),
  event: z.string().nullable().describe('Nome do evento/jogo (ex: "MIRASSOL X BOTAFOGO").'),
  betType: z
    .string()
    .nullable()
    .describe('Apenas para aposta simples: mercado/seleção apostado (ex: "Vitória Time A").'),
  bookmaker: z
    .string()
    .nullable()
    .describe('Apenas para aposta simples: nome da casa, casado com a lista fornecida.'),
  stake: z.number().nullable().describe('Apenas para aposta simples: valor apostado em R$.'),
  odds: z.number().nullable().describe('Apenas para aposta simples: odds decimal.'),
  status: z
    .enum(['pending', 'won', 'lost', 'cashed_out', 'void'])
    .describe('Use "pending" se o comprovante não indicar resultado; senão indique o resultado.'),
  date: z
    .string()
    .nullable()
    .describe('Data da aposta em ISO (YYYY-MM-DD), se visível no comprovante; caso contrário null.'),
  accountName: z
    .string()
    .nullable()
    .describe('Nome da conta usada, casado com a lista de contas fornecida.'),
  accountCpf: z
    .string()
    .nullable()
    .describe('CPF da conta usada, casado com a lista de contas fornecida.'),
  earnedFreebetValue: z
    .number()
    .nullable()
    .describe('Valor da freebet ganha com esta aposta, se visível; caso contrário null.'),
  isBoostedBet: z
    .boolean()
    .describe('true se a aposta é uma aposta aumentada/boosted.'),
  subBets: z
    .array(ExtractedSubBetSchema)
    .describe('Apenas para surebet/pa_surebet: lista das pernas apostadas.'),
});
export type ExtractBetFromImageOutput = z.infer<typeof ExtractBetFromImageOutputSchema>;

export async function extractBetFromImage(
  input: ExtractBetFromImageInput
): Promise<ExtractBetFromImageOutput> {
  return extractBetFromImageFlow(input);
}

export const extractBetFromImageFlow = ai.defineFlow(
  {
    name: 'extractBetFromImageFlow',
    inputSchema: ExtractBetFromImageInputSchema,
    outputSchema: ExtractBetFromImageOutputSchema,
  },
  async (input) => {
    const bookmakerHint = input.bookmakers?.length
      ? input.bookmakers.join(' | ')
      : 'nenhuma lista fornecida';
    const accountHint = input.accounts?.length
      ? input.accounts.map((a) => `${a.name} (${a.cpf})`).join(' | ')
      : 'nenhuma lista fornecida';

    const prompt = [
      {
        text:
          `Você é um analisador de comprovantes de apostas esportivas. Analise a imagem anexada e extraia ` +
          `os dados exatos para preencher o formulário de aposta do sistema.\n\n` +
          `REGRAS OBRIGATÓRIAS:\n` +
          `1. Detecte o tipo: "single" (uma aposta), "surebet" (2+ pernas, uma em cada casa, mesmo evento) ou ` +
          `"pa_surebet" (surebet envolvendo pagamento antecipado).\n` +
          `2. Para surebet/pa_surebet, preencha subBets com TODAS as pernas visíveis (casa, mercado, odds, valor).\n` +
          `3. Normalize o esporte para um destes valores: ${SPORT_OPTIONS.join(', ')}. Ex: "soccer"/"football" -> "Futebol".\n` +
          `4. Casamento de casas: use exatamente um nome da lista fornecida quando possível. Lista de casas: ${bookmakerHint}.\n` +
          `5. Casamento de contas: use nome e CPF exatamente da lista fornecida. Lista de contas: ${accountHint}.\n` +
          `6. Nunca invente dados. Onde não houver valor visível, use null (e false para booleanos).\n` +
          `7. Valores monetários em R$, sem símbolo. Odds em formato decimal (ex: 3.40).\n` +
          `8. Data em ISO (YYYY-MM-DD). Se não houver data visível, use null.\n` +
          `9. "status": use "pending" a menos que o comprovante mostre claramente resultado (ganho/perdido).\n` +
          `10. Se houver cashback visível, informe valor e modo ("fixed" para R$, "percent" para %).\n\n` +
          `Responda SOMENTE com o JSON preenchido de acordo com o schema.`,
      },
      {
        media: {
          url: input.image,
        },
      },
    ];

    const apiKey =
      input.apiKey ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'Chave do Gemini não configurada. Salve sua chave na página Configurações.'
      );
    }

    const generateOpts: Parameters<typeof ai.generate>[0] = {
      model: SUPPORTED_MODELS.includes(input.model as any)
        ? (input.model as string)
        : 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: ExtractBetFromImageOutputSchema },
    };
    generateOpts.config = {
      apiKey,
      thinkingConfig: { thinkingBudget: 0 },
    } as any;

    const { output } = await withRateLimitRetry(() => ai.generate(generateOpts));
    if (!output) throw new Error('No output from model');
    return output;
  }
);
