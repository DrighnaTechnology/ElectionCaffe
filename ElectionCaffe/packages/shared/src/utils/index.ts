import type { ApiResponse, PaginationMeta } from '../types/index.js';

/**
 * Create a successful API response
 */
export function successResponse<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Create an error API response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown[]
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Calculate skip value for database pagination
 */
export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Generate a random OTP code
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Generate a slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format a date to Indian locale string
 */
export function formatDateIndian(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Format a number to Indian currency
 */
export function formatCurrencyIndian(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with Indian locale (lakhs, crores)
 */
export function formatNumberIndian(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number, decimals: number = 1): number {
  if (total === 0) return 0;
  return Number(((value / total) * 100).toFixed(decimals));
}

/**
 * Calculate age from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * Mask mobile number for privacy (show only last 4 digits)
 */
export function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 4) return mobile;
  return 'XXXXXX' + mobile.slice(-4);
}

/**
 * Validate Indian mobile number
 */
export function isValidIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

/**
 * Validate EPIC (Voter ID) number
 */
export function isValidEPIC(epic: string): boolean {
  return /^[A-Z]{3}\d{7}$/.test(epic);
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV<T extends Record<string, string>>(
  csvString: string,
  delimiter: string = ','
): T[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0]!.split(delimiter).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(delimiter);
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || '';
    });
    results.push(obj as T);
  }

  return results;
}

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: string[]
): string {
  if (data.length === 0) return '';

  const keys = headers || Object.keys(data[0]!);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(keys.join(','));

  // Data rows
  for (const row of data) {
    const values = keys.map((key) => {
      const value = row[key];
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

/**
 * Group array by a key
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey]!.push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort array by multiple keys
 */
export function sortBy<T>(
  array: T[],
  ...keys: Array<keyof T | ((item: T) => unknown)>
): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      const aVal = typeof key === 'function' ? key(a) : a[key];
      const bVal = typeof key === 'function' ? key(b) : b[key];
      if ((aVal as number | string) < (bVal as number | string)) return -1;
      if ((aVal as number | string) > (bVal as number | string)) return 1;
    }
    return 0;
  });
}

/**
 * Remove duplicate objects from array by key
 */
export function uniqueBy<T, K extends keyof T>(array: T[], key: K): T[] {
  const seen = new Set<unknown>();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

/**
 * Check if object is empty
 */
export function isEmpty(obj: object): boolean {
  return Object.keys(obj).length === 0;
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert to title case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
