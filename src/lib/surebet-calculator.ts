// Função reutilizável para calcular surebet com cashback correto
export interface SubBetInput {
  stake?: number;
  odds?: number;
  isFreebet?: boolean;
  cashbackValue?: number | null;
  cashbackMode?: 'percent' | 'fixed' | null;
}

export interface SurebetCalculationResult {
  totalStake: number;
  guaranteedProfit: number;
  profitPercentage: number;
  minCashback: number;
  maxCashback: number;
}

export function calculateSurebet(subBets: SubBetInput[] | undefined): SurebetCalculationResult {
  if (!subBets || subBets.length < 2) {
    return { totalStake: 0, guaranteedProfit: 0, profitPercentage: 0, minCashback: 0, maxCashback: 0 };
  }

  // 1. Custo Real (Total Stake): Soma apenas as apostas com dinheiro real.
  const totalStake = subBets
    .filter(bet => !bet.isFreebet)
    .reduce((acc, bet) => acc + (bet.stake || 0), 0);

  if (totalStake <= 0 && !subBets.some(b => b.isFreebet)) {
    return { totalStake, guaranteedProfit: 0, profitPercentage: 0, minCashback: 0, maxCashback: 0 };
  }

  // 2. Calcula para cada cenário: qual é o retorno se a aposta i vencer?
  // Cashback é recebido APENAS nas apostas que perdem (não na vencedora)
  const potentialReturnsWithCashback = subBets.map((winBet, winIndex) => {
    const winStake = winBet.stake || 0;
    const winOdds = winBet.odds || 0;

    // Retorno bruto da aposta vencedora
    const grossReturn = winBet.isFreebet ? winStake * (winOdds - 1) : winStake * winOdds;

    // Calcula cashback apenas das apostas que PERDEM (todas exceto winIndex)
    const cashbackFromLosers = subBets.reduce((acc, loseBet, loseIndex) => {
      if (loseIndex === winIndex) return acc; // aposta vencedora não recebe cashback

      const loseStake = loseBet.stake || 0;
      const cashbackValue = loseBet.cashbackValue ?? 0;
      const cashbackMode = loseBet.cashbackMode ?? 'percent';
      const cashback = cashbackMode === 'percent'
        ? loseStake * (cashbackValue / 100)
        : cashbackValue;

      return acc + cashback;
    }, 0);

    // Resultado do cenário: retorno da vencedora - stake total + cashback das perdedoras
    return {
      profit: grossReturn - totalStake + cashbackFromLosers,
      cashback: cashbackFromLosers
    };
  });

  // 3. Lucro Garantido: É o pior cenário entre todos os retornos.
  const scenarioWithWorstProfit = potentialReturnsWithCashback.reduce((worst, current) =>
    current.profit < worst.profit ? current : worst
  );
  const guaranteedProfit = scenarioWithWorstProfit.profit;
  const minCashback = scenarioWithWorstProfit.cashback;

  // Cashback máximo (melhor cenário)
  const maxCashback = Math.max(...potentialReturnsWithCashback.map(s => s.cashback));

  // 4. Retorno Percentual (ROI)
  const profitPercentage = totalStake > 0 ? (guaranteedProfit / totalStake) * 100 : Infinity;

  return { totalStake, guaranteedProfit, profitPercentage, minCashback, maxCashback };
}
