"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Pencil, Target, TrendingUp } from "lucide-react";
import { cn, formatBRL } from "@/lib/utils";

interface DailyGoalCardProps {
  goal: number;
  todayProfit: number;
  onSaveGoal: (value: number) => Promise<void> | void;
}

export function DailyGoalCard({ goal, todayProfit, onSaveGoal }: DailyGoalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(goal ? String(goal) : "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDraft(goal ? String(goal) : "");
  }, [goal]);

  const percent = goal > 0 ? Math.max(0, (todayProfit / goal) * 100) : 0;
  const hit = goal > 0 && todayProfit >= goal;

  const handleSave = async () => {
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) return;
    setIsSaving(true);
    try {
      await onSaveGoal(value);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn("border-l-4", hit ? "border-l-green-500 bg-green-500/5" : "border-l-primary")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4 text-primary" /> Meta do Dia
        </CardTitle>
        {!isEditing && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Editar meta</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              className="h-9"
              placeholder="Ex: 100"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsEditing(false); setDraft(goal ? String(goal) : ""); }}>
              Cancelar
            </Button>
          </div>
        ) : goal > 0 ? (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className={cn("text-2xl font-bold", todayProfit >= 0 ? "text-green-500" : "text-destructive")}>
                  {formatBRL(todayProfit)}
                </p>
                <p className="text-xs text-muted-foreground">de {formatBRL(goal)} da meta</p>
              </div>
              <p className={cn("text-lg font-bold", hit ? "text-green-500" : "text-muted-foreground")}>
                {percent.toFixed(0)}%
              </p>
            </div>
            <Progress value={Math.min(100, percent)} className={cn(hit && "[&>div]:bg-green-500")} />
            {hit && (
              <p className="flex items-center gap-1 text-xs font-semibold text-green-500">
                <TrendingUp className="h-3.5 w-3.5" /> Meta batida hoje!
              </p>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-sm text-muted-foreground underline-offset-2 hover:underline"
          >
            Defina uma meta de lucro diário
          </button>
        )}
      </CardContent>
    </Card>
  );
}
