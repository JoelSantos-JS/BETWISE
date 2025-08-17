import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    isCurrency?: boolean;
    isPercentage?: boolean;
    className?: string;
}

export function SummaryCard({ title, value, icon: Icon, isCurrency, isPercentage, className }: SummaryCardProps) {
    
    const formattedValue = isCurrency 
        ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : isPercentage
        ? `${value.toFixed(2)}%`
        : value;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", className)}>
                    {formattedValue}
                </div>
            </CardContent>
        </Card>
    );
}
