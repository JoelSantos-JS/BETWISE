"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type DailyMonthResult = {
  day: number;
  label: string;
  profit: number;
};

type DailyMonthResultChartProps = {
  data: DailyMonthResult[];
  monthLabel: string;
  isLoading?: boolean;
};

export function DailyMonthResultChart({
  data,
  monthLabel,
  isLoading,
}: DailyMonthResultChartProps) {
  const [skeletonHeights, setSkeletonHeights] = React.useState<number[]>([]);
  const axisColor = "hsl(var(--muted-foreground))";
  const tooltipTextColor = "hsl(var(--foreground))";

  React.useEffect(() => {
    if (isLoading) {
      setSkeletonHeights(Array.from({ length: 14 }, () => Math.random() * 80 + 10));
    }
  }, [isLoading]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Resultado por Dia</CardTitle>
        <CardDescription>Lucro/prejuizo diario em {monthLabel}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="w-full h-full flex items-end gap-2 px-4">
            {skeletonHeights.map((height, index) => (
              <Skeleton key={index} className="h-full w-full" style={{ height: `${height}%` }} />
            ))}
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: axisColor }}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: axisColor }}
                tickFormatter={(value) =>
                  Number(value).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                    maximumFractionDigits: 0,
                  })
                }
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: tooltipTextColor,
                }}
                labelStyle={{ color: tooltipTextColor }}
                itemStyle={{ color: tooltipTextColor }}
                formatter={(value: number) =>
                  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                }
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Bar dataKey="profit" name="Resultado" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.day}`}
                    fill={entry.profit >= 0 ? "hsl(142 76% 45%)" : "hsl(var(--destructive))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-center text-muted-foreground">
            <div>
              <p>Nenhum resultado para exibir.</p>
              <p className="text-sm">Escolha um mes com apostas ou giros registrados.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
