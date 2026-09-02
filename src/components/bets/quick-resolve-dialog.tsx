"use client";

import { useEffect, useState } from "react";
import type { Bet, OutcomeScenario } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, DollarSign, GitCommitHorizontal, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";
import { calculateSurebet } from "@/lib/surebet-calculator";

type ResolveStatus = "won" | "lost" | "cashed_out" | "void";

const scenarioOptions: Record<OutcomeScenario, string> = {
  standard: "Resultado Padrão",
  double_green: "Duplo Green",
  pa_hedge: "P.A. com Cobertura",
};

interface QuickResolveDialogProps {
  bet: Bet | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (update: { status: ResolveStatus; realizedProfit?: number | null; outcomeScenario?: OutcomeScenario }) => Promise<void> | void;
}

// Quanto a aposta renderia se fosse resolvida com este status, pra pré-preencher
// o campo de lucro (o usuário só ajusta se o valor real bateu diferente).
function projectedProfit(bet: Bet, status: ResolveStatus): number {
  if (status === "lost") {
    return bet.type === "single" ? -(bet.stake ?? 0) : -(bet.totalStake ?? 0);
  }
  if (status === "won") {
    if (bet.type === "single") {
      return (bet.stake ?? 0) * (bet.odds ?? 0) - (bet.stake ?? 0);
    }
    const recalculated = bet.subBets ? calculateSurebet(bet.subBets) : null;
    return recalculated?.guaranteedProfit ?? bet.guaranteedProfit ?? 0;
  }
  return 0;
}

export function QuickResolveDialog({ bet, onOpenChange, onConfirm }: QuickResolveDialogProps) {
  const [status, setStatus] = useState<ResolveStatus | null>(null);
  const [realizedProfit, setRealizedProfit] = useState("");
  const [outcomeScenario, setOutcomeScenario] = useState<OutcomeScenario>("standard");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStatus(null);
    setRealizedProfit("");
    setOutcomeScenario("standard");
    setIsSaving(false);
  }, [bet]);

  if (!bet) return null;

  const needsProfitInput = status === "won" || status === "cashed_out";
  const showScenario = status === "won" && bet.type === "pa_surebet";

  const handlePickStatus = (next: ResolveStatus) => {
    setStatus(next);
    setRealizedProfit(projectedProfit(bet, next).toFixed(2));
  };

  const handleConfirm = async (finalStatus: ResolveStatus) => {
    setIsSaving(true);
    try {
      await onConfirm({
        status: finalStatus,
        realizedProfit: needsProfitInput ? (realizedProfit === "" ? null : Number(realizedProfit)) : null,
        outcomeScenario: showScenario ? outcomeScenario : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={!!bet} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="line-clamp-2">Finalizar aposta</DialogTitle>
          <DialogDescription className="line-clamp-2">{bet.event}</DialogDescription>
        </DialogHeader>

        {status === null ? (
          <div className="grid grid-cols-2 gap-3 py-2">
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 border-green-500/40 text-green-600 hover:bg-green-500/10 hover:text-green-600"
              onClick={() => handlePickStatus("won")}
            >
              <TrendingUp className="h-5 w-5" /> Ganha
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handlePickStatus("lost")}
            >
              <TrendingDown className="h-5 w-5" /> Perdida
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 border-blue-500/40 text-blue-600 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={() => handlePickStatus("cashed_out")}
            >
              <DollarSign className="h-5 w-5" /> Cash Out
            </Button>
            <Button
              variant="outline"
              className="h-16 flex-col gap-1 text-muted-foreground"
              onClick={() => handlePickStatus("void")}
            >
              <GitCommitHorizontal className="h-5 w-5" /> Anular
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {showScenario && (
              <div className="space-y-2">
                <Label>Cenário de Resolução</Label>
                <Select value={outcomeScenario} onValueChange={(v) => setOutcomeScenario(v as OutcomeScenario)}>
                  <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(scenarioOptions).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {needsProfitInput && (
              <div className="space-y-2">
                <Label htmlFor="quick-resolve-profit">
                  {status === "cashed_out" ? "Valor recebido no Cash Out (lucro/prejuízo)" : "Lucro final (R$)"}
                </Label>
                <Input
                  id="quick-resolve-profit"
                  type="number"
                  step="0.01"
                  className="h-11"
                  value={realizedProfit}
                  onChange={(e) => setRealizedProfit(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Sugerido: {formatBRL(projectedProfit(bet, status))}. Ajuste se o valor real foi diferente.
                </p>
              </div>
            )}

            {!needsProfitInput && (
              <p className={cn("text-sm", status === "lost" ? "text-destructive" : "text-muted-foreground")}>
                {status === "lost"
                  ? `Prejuízo: ${formatBRL(projectedProfit(bet, status))}`
                  : "A aposta será marcada como anulada, sem lucro ou prejuízo."}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
          {status !== null ? (
            <Button variant="ghost" onClick={() => setStatus(null)} disabled={isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          )}
          {status !== null && (
            <Button onClick={() => handleConfirm(status)} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
