import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getTenantTypeLabel(type: string): string {
  switch (type) {
    case 'POLITICAL_PARTY':
      return 'Political Party';
    case 'INDIVIDUAL_CANDIDATE':
      return 'Individual Candidate';
    case 'ELECTION_MANAGEMENT':
      return 'Election Management';
    default:
      return type;
  }
}

export function getTenantTypeColor(type: string): string {
  switch (type) {
    case 'POLITICAL_PARTY':
      return 'bg-blue-100 text-blue-800';
    case 'INDIVIDUAL_CANDIDATE':
      return 'bg-green-100 text-green-800';
    case 'ELECTION_MANAGEMENT':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
