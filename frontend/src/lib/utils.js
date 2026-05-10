import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '—';
  return num.toLocaleString();
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function getStatusBadge(status) {
  const map = {
    active: 'success', running: 'success', healthy: 'success', open: 'info',
    done: 'success', completed: 'success', resolved: 'success',
    warning: 'warning', pending: 'warning', draft: 'warning',
    error: 'danger', inactive: 'neutral', failed: 'danger', blocked: 'danger',
    todo: 'info', inbox: 'info', acknowledged: 'warning', closed: 'neutral',
  };
  return map[status?.toLowerCase()] || 'neutral';
}
