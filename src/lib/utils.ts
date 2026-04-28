import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatter manual pt-BR para evitar bugs de locale do browser/Node
export function formatBRL(value: number): string {
  const negative = value < 0;
  const cents = Math.round(Math.abs(value) * 100);
  const reais = Math.floor(cents / 100);
  const centsPart = (cents % 100).toString().padStart(2, '0');
  const reaisStr = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? '-' : ''}R$ ${reaisStr},${centsPart}`;
}
