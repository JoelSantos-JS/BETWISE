

export interface Product {
  id: string;
  name: string;
  category: string;
  supplier: string;
  aliexpressLink: string;
  imageUrl: string;
  description: string;
  notes?: string;
  trackingCode?: string; // Código de rastreio
  purchaseEmail?: string; // Email usado na compra
  
  // Custos
  purchasePrice: number;
  shippingCost: number;
  importTaxes: number;
  packagingCost: number;
  marketingCost: number;
  otherCosts: number;
  totalCost: number;
  
  // Vendas
  sellingPrice: number;
  expectedProfit: number;
  profitMargin: number;
  sales: Sale[];
  
  // Controle
  quantity: number;
  quantitySold: number;
  status: 'purchased' | 'shipping' | 'received' | 'selling' | 'sold';
  purchaseDate: Date;
  
  // Métricas
  roi: number;
  actualProfit: number;
}

export interface Sale {
    id: string;
    date: Date;
    quantity: number;
    buyerName?: string;
}


export interface Dream {
  id: string;
  name: string;
  type: 'travel' | 'business' | 'personal';
  targetAmount: number;
  currentAmount: number;
  status: 'planning' | 'in_progress' | 'completed';
  notes?: string;
  plan?: DreamPlan | null;
}

export interface DreamPlan {
  description: string;
  estimatedCost: {
    item: string;
    cost: number;
  }[];
  totalEstimatedCost: number;
  actionPlan: {
    step: number;
    action: string;
    details: string;
  }[];
  importantNotes: string[];
  imageUrl: string;
}

export interface SubBet {
    id: string;
    bookmaker: string; // Casa de apostas
    betType: string;
    odds: number;
    stake: number;
    isFreebet?: boolean;
}

export interface Bet {
  id: string;
  type: 'single' | 'surebet';
  sport: string;
  event: string;
  date: Date;
  status: 'pending' | 'won' | 'lost' | 'cashed_out' | 'void';
  notes?: string;
  earnedFreebetValue?: number | null; // Valor da freebet ganha com esta aposta

  // For 'single' bets
  betType?: string | null;
  stake?: number | null;
  odds?: number | null;
  
  // For 'surebet'
  subBets?: SubBet[] | null;
  totalStake?: number | null;
  guaranteedProfit?: number | null;
  profitPercentage?: number | null;

  analysis?: BetAnalysis;
}

export interface BetAnalysis {
    recommendation: 'good' | 'average' | 'bad' | 'neutral';
    justification: string;
    suggestedActions: string[];
}
