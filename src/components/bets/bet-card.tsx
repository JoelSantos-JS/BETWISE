"use client";

import type { Bet } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building,
  Calendar,
  DollarSign,
  Edit,
  Gift,
  GitCommitHorizontal,
  Hourglass,
  List,
  MoreVertical,
  ShieldCheck,
  Star,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { cn, formatBRL } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { calculateSurebet } from "@/lib/surebet-calculator";

interface BetCardProps {
  bet: Bet;
  onEdit: () => void;
  onDelete: () => void;
}

const statusMap = {
  pending: { label: "Pendente", color: "bg-yellow-500", icon: Hourglass },
  won: { label: "Ganha", color: "bg-green-500", icon: TrendingUp },
  lost: { label: "Perdida", color: "bg-red-500", icon: TrendingDown },
  cashed_out: { label: "Cash Out", color: "bg-blue-500", icon: DollarSign },
  void: { label: "Anulada", color: "bg-gray-500", icon: GitCommitHorizontal },
};

const scenarioMap = {
  double_green: { label: "Duplo Green", icon: Zap },
  pa_hedge: { label: "P.A. com Cobertura", icon: ShieldCheck },
  standard: { label: "", icon: null },
};

export function BetCard({ bet, onEdit, onDelete }: BetCardProps) {
  const statusInfo = statusMap[bet.status];
  const scenarioInfo = bet.outcomeScenario ? scenarioMap[bet.outcomeScenario] : null;
  const earnedFreebet = Boolean(bet.earnedFreebetValue && bet.earnedFreebetValue > 0);

  const surebetRecalculated =
    (bet.type === "surebet" || bet.type === "pa_surebet") && bet.subBets
      ? calculateSurebet(bet.subBets)
      : null;

  const profit = (() => {
    if (bet.realizedProfit !== null && bet.realizedProfit !== undefined) return bet.realizedProfit;
    if (bet.status !== "won" && bet.status !== "lost") return null;

    if (bet.type === "single") {
      const stake = bet.stake ?? 0;
      const odds = bet.odds ?? 0;
      if (bet.status === "won") return stake * odds - stake;
      if (bet.status === "lost") return -stake;
      return 0;
    }

    if (bet.type === "surebet" || bet.type === "pa_surebet") {
      if (bet.status === "lost") return -(bet.totalStake ?? 0);
      return surebetRecalculated?.guaranteedProfit ?? null;
    }

    return null;
  })();

  return (
    <Card className="flex h-full flex-col overflow-hidden border-l-4" style={{ borderLeftColor: statusInfo.color }}>
      <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {bet.type === "surebet" && (
                <Badge className="gap-1.5 border-transparent bg-teal-500 text-white hover:bg-teal-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> Surebet
                </Badge>
              )}
              {bet.type === "pa_surebet" && (
                <Badge className="gap-1.5 border-transparent bg-orange-500 text-white hover:bg-orange-600">
                  <Target className="h-3.5 w-3.5" /> P.A. Surebet
                </Badge>
              )}
              <Badge variant="secondary">{bet.sport}</Badge>
              {bet.bookmaker && bet.type === "single" && (
                <Badge variant="outline" className="max-w-full gap-1.5 truncate">
                  <Building className="h-3 w-3 shrink-0" /> <span className="truncate">{bet.bookmaker}</span>
                </Badge>
              )}
              {bet.type === "single" && bet.isBoostedBet && (
                <Badge className="gap-1.5 border-transparent bg-yellow-500 text-black hover:bg-yellow-600">
                  <Zap className="h-3 w-3" /> Aumentada
                </Badge>
              )}
              {bet.accountName && <Badge variant="secondary" className="max-w-full truncate">{bet.accountName}</Badge>}
              {bet.accountCpf && <Badge variant="secondary">{bet.accountCpf}</Badge>}
              {scenarioInfo && scenarioInfo.icon && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="default" className="gap-1.5">
                        <scenarioInfo.icon className="h-3.5 w-3.5" /> {scenarioInfo.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Esta aposta foi resolvida como: {scenarioInfo.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <CardTitle className="mt-2 line-clamp-2 text-base font-bold leading-snug sm:text-lg">
              {bet.event}
            </CardTitle>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Mais opcoes</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 p-3 pt-1 sm:space-y-4 sm:p-4 sm:pt-2">
        {bet.type === "single" ? (
          <>
            <div>
              <p className="line-clamp-2 text-sm font-semibold text-primary">{bet.betType}</p>
              <p className="text-xs text-muted-foreground">Tipo de Aposta</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <MetricBox label="Apostado (Stake)" value={formatBRL(Number(bet.stake ?? 0))} />
              <MetricBox label="Odds" value={`@${(bet.odds ?? 0).toFixed(2)}`} />
            </div>
          </>
        ) : (
          <>
            {(() => {
              const totalStake = surebetRecalculated?.totalStake ?? bet.totalStake ?? 0;
              const guaranteedProfit = surebetRecalculated?.guaranteedProfit ?? bet.guaranteedProfit ?? 0;
              const retornoTotal = totalStake + guaranteedProfit;
              const displayedProfit =
                bet.status === "won" && bet.realizedProfit !== null && bet.realizedProfit !== undefined
                  ? bet.realizedProfit
                  : guaranteedProfit;
              const roi = surebetRecalculated?.profitPercentage ?? bet.profitPercentage ?? 0;

              return (
                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <MetricBox
                    label="Retorno Total"
                    value={formatBRL(retornoTotal)}
                    valueClassName={retornoTotal >= totalStake ? "text-green-500" : "text-destructive"}
                  />
                  <MetricBox
                    label={earnedFreebet && bet.status === "won" ? "Freebet Ganha" : displayedProfit === bet.realizedProfit ? "Lucro Final" : "Lucro Garantido"}
                    value={earnedFreebet && bet.status === "won" ? formatBRL(bet.earnedFreebetValue ?? 0) : formatBRL(displayedProfit)}
                    valueClassName={displayedProfit >= 0 ? "text-green-500" : "text-destructive"}
                  />
                  <MetricBox label="Total Apostado" value={formatBRL(totalStake)} valueClassName="text-muted-foreground" />
                  <MetricBox
                    label="Retorno (%)"
                    value={Number.isFinite(roi) ? `${roi.toFixed(2)}%` : "N/A"}
                    valueClassName={roi >= 0 ? "text-green-500" : "text-destructive"}
                  />
                </div>
              );
            })()}

            {bet.subBets && bet.subBets.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sub-bets">
                  <AccordionTrigger className="py-2 text-sm">
                    <List className="mr-2 h-4 w-4" /> Ver {bet.subBets.length} Apostas
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="mt-2 space-y-2 text-sm">
                      {bet.subBets.map((sub) => (
                        <li key={sub.id} className="rounded-md bg-secondary/50 p-2">
                          <div className="flex flex-col gap-1 font-semibold sm:flex-row sm:items-center sm:justify-between">
                            <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                              {sub.isFreebet && <Star className="h-4 w-4 text-yellow-500" />}
                              <span className="truncate">{sub.bookmaker}</span>
                              {sub.hasPa === false && (
                                <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/50">
                                  Sem P.A.
                                </Badge>
                              )}
                              {sub.hasPa === true && (
                                <Badge variant="outline" className="text-xs text-green-500 border-green-500/50">
                                  P.A.
                                </Badge>
                              )}
                            </span>
                            <Badge variant="outline" className="w-fit">@{typeof sub.odds === "number" ? sub.odds.toFixed(2) : "--"}</Badge>
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sub.betType}</div>
                          <div className="mt-1 text-right font-bold text-primary">
                            {formatBRL(Number(sub.stake || 0))}
                            {sub.isFreebet && <span className="text-xs font-normal text-muted-foreground"> (Freebet)</span>}
                            {sub.cashbackValue && sub.cashbackValue > 0 && (
                              <span className="ml-2 text-xs font-normal text-purple-500">
                                cashback {sub.cashbackValue}{sub.cashbackMode === "percent" ? "%" : ""}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {surebetRecalculated && (surebetRecalculated.minCashback || 0) > 0 && (
                      <div className="mt-4 rounded-md border border-purple-500/20 bg-purple-500/10 p-2 text-sm">
                        <p className="text-muted-foreground">Cashback Extraivel:</p>
                        <p className="font-bold text-purple-500">
                          {surebetRecalculated.minCashback === surebetRecalculated.maxCashback
                            ? formatBRL(surebetRecalculated.minCashback)
                            : `${formatBRL(surebetRecalculated.minCashback)} ~ ${formatBRL(surebetRecalculated.maxCashback)}`}
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}

        {bet.notes && (
          <p className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm text-muted-foreground">{bet.notes}</p>
        )}
      </CardContent>

      <CardFooter className="mt-auto flex flex-col items-stretch gap-2 bg-secondary/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(bet.date).toLocaleDateString("pt-BR")}</span>
        </div>
        <Badge className={`min-h-8 justify-center gap-1.5 border-transparent text-white ${statusInfo.color}`}>
          <statusInfo.icon className="h-4 w-4" />
          <span>{statusInfo.label}</span>
          {earnedFreebet && bet.status === "won" ? (
            <span className="flex items-center gap-1 font-bold text-yellow-300">
              (<Gift className="h-3 w-3" /> {formatBRL(bet.earnedFreebetValue ?? 0)})
            </span>
          ) : profit !== null ? (
            <span className={cn("font-bold", profit < 0 ? "text-red-300" : "text-green-300")}>
              ({formatBRL(profit)})
            </span>
          ) : null}
        </Badge>
      </CardFooter>
    </Card>
  );
}

function MetricBox({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-md bg-secondary/30 p-2">
      <p className={cn("font-bold", valueClassName)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
