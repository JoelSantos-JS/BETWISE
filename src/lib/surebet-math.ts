// ===============================
// Biblioteca completa de matemática para Surebets
// Inclui: verificação de arbitragem, alocação com fees,
// arredondamento inteligente, autoajuste e cobertura de cenários
// ===============================

// Core utils
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const round2 = (x: number) => Number(x.toFixed(2));

// ===============================
// 1) Checagem de surebet
// odds: número[]
export function checkSurebet(odds: number[]) {
  const S = odds.reduce((acc, o) => acc + 1 / o, 0);
  return { S, isSurebet: S < 1 };
}

// ===============================
// 2) Alocação com fee e limites + autoajuste
// odds: número[]
// total: número (T)
// fees: número[] em %, por casa (ex: [0, 2, 1.5]) -> 0.00 se não houver
// minStake/maxStake: número[] (opcionais) por casa; use null/undefined se não aplica
//
// Retorno com stakes/retornos/lucro/roi já otimizados pós-arredondamento
export function allocateStakes({
  odds,
  total,
  fees = [],
  minStake = [],
  maxStake = [],
  maxIterations = 500,
  skipSurebetCheck = false
}: {
  odds: number[];
  total: number;
  fees?: number[];
  minStake?: (number | null)[];
  maxStake?: (number | null)[];
  maxIterations?: number;
  skipSurebetCheck?: boolean;
}) {
  const n = odds.length;
  const feesDec = Array.from({ length: n }, (_, i) => (fees[i] || 0) / 100);

  const { S, isSurebet } = checkSurebet(odds);
  // Se não for surebet e estiver permitido pular a checagem, seguimos mesmo assim
  if (!isSurebet && !skipSurebetCheck) {
    return { ok: false, reason: `Não é surebet (S=${S.toFixed(6)} ≥ 1)` };
  }

  // Alocação teórica sem arredondamento (retorno igual bruto)
  let rawStakes = odds.map((o, i) => (total / o) / S);

  // Aplica limites de stake (se existirem) — corrige proporcionalmente
  function applyLimits(stakes: number[]) {
    let adj = [...stakes];
    let changed = true;
    let iter = 0;
    while (changed && iter++ < 50) {
      changed = false;
      for (let i = 0; i < n; i++) {
        if (minStake[i] != null && adj[i] < minStake[i]!) {
          adj[i] = minStake[i]!;
          changed = true;
        }
        if (maxStake[i] != null && adj[i] > maxStake[i]!) {
          adj[i] = maxStake[i]!;
          changed = true;
        }
      }
      const sumAdj = sum(adj);
      if (sumAdj !== total) {
        // Reescala proporcionalmente quem ainda pode ajustar
        const freeIdx = [];
        for (let i = 0; i < n; i++) {
          const canUp = (maxStake[i] == null) || (adj[i] < maxStake[i]!);
          const canDown = (minStake[i] == null) || (adj[i] > minStake[i]!);
          if (canUp || canDown) freeIdx.push(i);
        }
        if (freeIdx.length > 0) {
          const factor = total / sumAdj;
          for (const i of freeIdx) adj[i] *= factor;
        }
      }
    }
    return adj;
  }

  rawStakes = applyLimits(rawStakes);

  // Arredonda para 2 casas
  let stakes = rawStakes.map(round2);

  // Rebalance rápido: ajusta centavos para bater total
  function rebalanceToTotal(stk: number[], T: number) {
    let diff = round2(T - sum(stk));
    // Ajusta centavos distribuindo 0.01
    const step = diff > 0 ? 0.01 : -0.01;
    let guard = 0;
    while (Math.abs(diff) >= 0.01 && guard++ < 1000) {
      // escolha o índice que mais aproxima o retorno mínimo ao aumentar/diminuir
      let bestIdx = 0, bestScore = -Infinity;
      for (let i = 0; i < n; i++) {
        const tryStake = round2(stk[i] + step);
        if (minStake[i] != null && tryStake < minStake[i]!) continue;
        if (maxStake[i] != null && tryStake > maxStake[i]!) continue;
        // score = retorno mínimo após este ajuste
        const tmp = [...stk];
        tmp[i] = tryStake;
        const returnsGross = tmp.map((v, j) => round2(v * odds[j]));
        const returnsNet = returnsGross.map((rg, j) => round2(rg * (1 - feesDec[j])));
        const minRet = Math.min(...returnsNet);
        const score = minRet;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      stk[bestIdx] = round2(stk[bestIdx] + step);
      diff = round2(T - sum(stk));
    }
    return stk;
  }

  stakes = rebalanceToTotal(stakes, total);

  // Calcula retornos brutos e líquidos (aplicando fee na liquidação)
  const returnsGross = stakes.map((v, i) => round2(v * odds[i]));
  const returnsNet = returnsGross.map((rg, i) => round2(rg * (1 - feesDec[i])));

  const menorRetorno = Math.min(...returnsNet);
  const lucro = round2(menorRetorno - sum(stakes));
  const roi = round2((lucro / sum(stakes)) * 100);

  // Tentativa de autoajuste (subindo minRet) por alguns passos
  let best = { stakes: [...stakes], menorRetorno, lucro, roi };
  let iter = 0;
  while (iter++ < maxIterations) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      // tenta +1 centavo em i e -1 no melhor candidato j
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const a = [...best.stakes];
        a[i] = round2(a[i] + 0.01);
        a[j] = round2(a[j] - 0.01);
        if (a[i] < 0.01 || a[j] < 0.01) continue;
        if (minStake[i] != null && a[i] < minStake[i]!) continue;
        if (minStake[j] != null && a[j] < minStake[j]!) continue;
        if (maxStake[i] != null && a[i] > maxStake[i]!) continue;
        if (maxStake[j] != null && a[j] > maxStake[j]!) continue;

        const rg = a.map((v, k) => round2(v * odds[k]));
        const rn = rg.map((x, k) => round2(x * (1 - feesDec[k])));
        const minR = Math.min(...rn);
        const L = round2(minR - sum(a));
        if (L > best.lucro) {
          best = { stakes: a, menorRetorno: minR, lucro: L, roi: round2((L / sum(a)) * 100) };
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
    if (!improved) break;
  }

  const finalReturnsGross = best.stakes.map((v, i) => round2(v * odds[i]));
  const finalReturnsNet = finalReturnsGross.map((rg, i) => round2(rg * (1 - feesDec[i])));

  return {
    ok: true,
    S: Number(S.toFixed(6)),
    odds,
    stakes: best.stakes,
    totalInvestido: round2(sum(best.stakes)),
    returnsBrutos: finalReturnsGross,
    returnsLiquidos: finalReturnsNet,
    menorRetorno: Math.min(...finalReturnsNet),
    lucro: best.lucro,
    roi: best.roi,
    isSurebet
  };
}

// ===============================
// 3) Checker de cobertura de cenários (resultado x escanteios)
// scenarios: array de strings tipo "A&A", "A&B", "EMP&A", etc.
// markets: [{ name, covers: Set<string> }, ...]
export function checkCoverage(
  scenarios: string[],
  markets: { name: string; covers: Set<string> }[]
) {
  const uncovered = [];
  for (const sc of scenarios) {
    const covered = markets.some(m => m.covers.has(sc));
    if (!covered) uncovered.push(sc);
  }
  return { allCovered: uncovered.length === 0, uncovered };
}

// Helper para montar rapidamente o caso Resultado+Escanteios
export function buildREScenarios() {
  // Formato: `${resultado}-${escanteios}`
  // Resultado: A, EMP, B
  // Escanteios: A, B, EMP
  const R = ["A", "EMP", "B"];
  const E = ["A", "B", "EMP"];
  const S = [];
  for (const r of R) for (const e of E) S.push(`${r}-${e}`);
  return S;
}

// Exemplo de mapeamento dos 3 mercados do seu print:
export function buildMarketsExample() {
  return [
    {
      name: "M1: Vitória A & Esc A",
      covers: new Set(["A-A"])
    },
    {
      name: "M2: HE 0:1 Empate & Esc A",
      // Dependendo das regras, cobre EMP-A e alguns A-A/A-EMP no handicap.
      // Para simplificar o mapa de cenários (visual), marcamos os de escanteios A fora da vitória simples:
      covers: new Set(["EMP-A", "B-A"]) // ajuste conforme sua regra real da casa
    },
    {
      name: "M3: Escanteios Handicap B +1",
      covers: new Set(["A-B", "A-EMP", "EMP-B", "EMP-EMP", "B-B", "B-EMP"])
    }
  ];
}

// ===============================
// 4) Tipos TypeScript para melhor integração
export interface SurebetResult {
  ok: boolean;
  reason?: string;
  S?: number;
  odds?: number[];
  stakes?: number[];
  totalInvestido?: number;
  returnsBrutos?: number[];
  returnsLiquidos?: number[];
  menorRetorno?: number;
  lucro?: number;
  roi?: number;
}

export interface Market {
  name: string;
  covers: Set<string>;
}

export interface CoverageResult {
  allCovered: boolean;
  uncovered: string[];
}

// ===============================
// 5) Exemplo de uso rápido
// Odds do seu print aproximado: [3.00, 3.50, 3.90]
// Total investido ~ 163.85
export function runExample() {
  const example = allocateStakes({
    odds: [3.00, 3.50, 3.90],
    total: 163.85,
    fees: [0, 0, 0], // coloque % de taxa aqui por casa se houver
  });
  console.log("Plano:", example);

  // Cobertura (resultado x escanteios)
  const scenarios = buildREScenarios();
  const markets = buildMarketsExample();
  console.log("Cobertura:", checkCoverage(scenarios, markets));
  
  return { example, coverage: checkCoverage(scenarios, markets) };
}

// ===============================
// 6) Funções auxiliares para cálculos específicos

// Calcula o investimento total necessário para um lucro desejado
export function calculateTotalForProfit(odds: number[], desiredProfit: number): number {
  const { S } = checkSurebet(odds);
  if (S >= 1) return 0; // Não é surebet
  
  // Lucro = (T/S) - T = T(1/S - 1)
  // desiredProfit = T(1/S - 1)
  // T = desiredProfit / (1/S - 1)
  const factor = (1/S) - 1;
  return round2(desiredProfit / factor);
}

// Calcula ROI teórico de uma surebet
export function calculateTheoreticalROI(odds: number[]): number {
  const { S, isSurebet } = checkSurebet(odds);
  if (!isSurebet) return 0;
  
  // ROI = (1/S - 1) * 100
  return round2(((1/S) - 1) * 100);
}

// Verifica se as odds mudaram significativamente
export function hasSignificantOddsChange(
  oldOdds: number[], 
  newOdds: number[], 
  threshold: number = 0.05
): boolean {
  if (oldOdds.length !== newOdds.length) return true;
  
  for (let i = 0; i < oldOdds.length; i++) {
    const change = Math.abs(oldOdds[i] - newOdds[i]) / oldOdds[i];
    if (change > threshold) return true;
  }
  
  return false;
}
