import { Calculator } from "lucide-react";

import { AdvancedSurebetCalculator } from "@/components/bets/advanced-surebet-calculator";

export default function CalculadoraSurebetPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Calculadora Avancada de Surebet
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Calculo de stake, LAY, comissao, freebet e ROI em uma tela dedicada.
        </p>
      </div>
      <AdvancedSurebetCalculator />
    </div>
  );
}
