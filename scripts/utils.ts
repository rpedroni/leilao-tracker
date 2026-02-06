import type { Property } from './types.ts';
import { MIN_DISCOUNT, MAX_PRICE, PRIORITY_NEIGHBORHOODS } from './types.ts';

/**
 * Check if property meets filter criteria
 */
export function meetsFilters(property: Property): boolean {
  // Must have discount >40% and price <800k
  if (property.desconto === null || property.desconto < MIN_DISCOUNT) {
    return false;
  }
  if (property.lance > MAX_PRICE) {
    return false;
  }
  return true;
}

/**
 * Check if property is in priority neighborhood
 */
export function isPriorityNeighborhood(bairro: string): boolean {
  return PRIORITY_NEIGHBORHOODS.some(n => 
    bairro.toLowerCase().includes(n.toLowerCase()) ||
    n.toLowerCase().includes(bairro.toLowerCase())
  );
}

/**
 * Format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDateBR(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse Brazilian date DD/MM/YYYY to ISO YYYY-MM-DD
 */
export function parseBRDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Extract price from Brazilian currency string
 */
export function parsePrice(priceStr: string): number | null {
  const cleaned = priceStr.replace(/[^\d,]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(avaliacao: number, lance: number): number {
  return Math.round(((avaliacao - lance) / avaliacao) * 100);
}

/**
 * Normalize text for comparison (remove accents, lowercase, trim)
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Log with timestamp
 */
export function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const emoji = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${emoji} [${timestamp}] ${message}`);
}
