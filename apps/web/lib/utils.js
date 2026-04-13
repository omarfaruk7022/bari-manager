import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatTaka(amount) {
  return `৳${Number(amount || 0).toLocaleString('bn-BD')}`
}

export function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatDateBn(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('bn-BD', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
