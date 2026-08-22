import { clsx, type ClassValue } from "clsx"
import { format } from "date-fns"
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

// Datas vindas do Firestore/IA podem ser inválidas ("", null, string quebrada,
// Timestamp). format() do date-fns lança RangeError e derruba a página inteira,
// então tudo passa por aqui antes de virar texto.
export function toValidDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
    try {
      const d = (value as any).toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDateSafe(
  value: unknown,
  pattern: string,
  fallback = '--',
  options?: Parameters<typeof format>[2]
): string {
  const date = toValidDate(value);
  if (!date) return fallback;
  try {
    return format(date, pattern, options);
  } catch {
    return fallback;
  }
}
