import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, formatString = "PPP") {
  return format(new Date(date), formatString);
}

export function normalizeName(name: string): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function maskPatientName(name: string): string {
  if (!name) return '';
  return name.split(' ').map(word => {
    if (word.length <= 2) return word + 'X'.repeat(Math.max(0, 3 - word.length));
    return word.substring(0, 2) + 'X'.repeat(word.length - 2);
  }).join(' ');
}
