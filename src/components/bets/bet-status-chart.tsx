import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { PieChart } from 'lucide-react';

export function BetStatusChart({ data, isLoading }: { data: any[], isLoading: boolean }) {
  return (
    <Card className="h-full">
       <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary"/>
            Status das Apostas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="w-full h-[250px]" /> : <div className="flex items-center justify-center h-[250px] bg-muted rounded-md"><p>Gráfico de status</p></div>}
      </CardContent>
    </Card>
  );
}
