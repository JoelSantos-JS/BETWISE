import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export function SurebetCalculator() {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Calculadora de Surebet Simples</CardTitle>
            <CardDescription>Calcule apostas seguras com duas possíveis saídas.</CardDescription>
        </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Calculadora simples aqui.</p>
      </CardContent>
    </Card>
  );
}
