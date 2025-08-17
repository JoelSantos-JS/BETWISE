"use client"

import * as React from "react"
import { Pie, PieChart, Cell, Tooltip } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { Bet } from "@/lib/types"

type BetStatusChartProps = {
    data: Bet[];
    isLoading?: boolean;
}

const statusConfigMap = {
  pending: { label: 'Pendentes', color: "hsl(var(--chart-3))" },
  won: { label: 'Ganhas', color: "hsl(var(--chart-2))" },
  lost: { label: 'Perdidas', color: "hsl(var(--chart-1))" },
  cashed_out: { label: 'Cash Out', color: "hsl(var(--chart-4))" },
  void: { label: 'Anuladas', color: "hsl(var(--chart-5))" },
}


export function BetStatusChart({ data, isLoading }: BetStatusChartProps) {
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const statusCounts = data.reduce((acc, bet) => {
      acc[bet.status] = (acc[bet.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
        name: statusConfigMap[status as keyof typeof statusConfigMap].label,
        value: count,
        fill: statusConfigMap[status as keyof typeof statusConfigMap].color,
    }));

  }, [data]);

  const chartConfig = Object.fromEntries(
    chartData.map(item => [item.name, {label: item.name, color: item.fill}])
  ) as ChartConfig;


  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="items-center pb-0">
        <CardTitle>Resultados das Apostas</CardTitle>
        <CardDescription>Distribuição por status</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center h-[300px]">
        {isLoading ? (
            <Skeleton className="w-[250px] h-[250px] rounded-full" />
        ) : chartData.length > 0 ? (
            <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
            >
            <PieChart>
                <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent nameKey="name" />}
                />
                <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
                >
                {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                ))}
                </Pie>
            </PieChart>
            </ChartContainer>
        ) : (
            <div className="text-center text-muted-foreground py-10">
                <p>Nenhum dado para exibir.</p>
                <p className="text-sm">Adicione apostas para ver o gráfico.</p>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
