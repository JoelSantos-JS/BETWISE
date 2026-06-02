import { Calculator } from "lucide-react";

import { AdvancedSurebetCalculator } from "@/components/bets/advanced-surebet-calculator";

export default function CalculadoraSurebetPage() {
  return (
    <>
      <div className="mb-6 space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-8 w-8 text-primary" />
          Calculadora Avancada de Surebet
        </h2>
        <p className="text-muted-foreground">
          Calculo de stake, LAY, comissao, freebet e ROI em uma tela dedicada.
        </p>
      </div>
      <AdvancedSurebetCalculator />
    </>
  );
}
