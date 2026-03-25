// Utility functions for Roompact MVP

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options,
    });
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(d);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dueDate: string | Date): boolean {
    const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    return d < new Date(new Date().toDateString());
}

/**
 * Check if a date is today
 */
export function isToday(date: string | Date): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    return d.toDateString() === today.toDateString();
}

/**
 * Get days until a date
 */
export function daysUntil(date: string | Date): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date(new Date().toDateString());
    const diffMs = d.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get status color classes for different statuses
 */
export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        // Rent statuses
        pending: 'bg-yellow-100 text-yellow-800',
        paid: 'bg-green-100 text-green-800',
        overdue: 'bg-red-100 text-red-800',
        waived: 'bg-gray-100 text-gray-800',
        // Chore statuses
        completed: 'bg-green-100 text-green-800',
        missed: 'bg-red-100 text-red-800',
        // Agreement statuses
        draft: 'bg-gray-100 text-gray-800',
        active: 'bg-green-100 text-green-800',
        superseded: 'bg-orange-100 text-orange-800',
        archived: 'bg-gray-100 text-gray-600',
        // Exit request statuses
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
        // Member roles
        admin: 'bg-indigo-100 text-indigo-800',
        member: 'bg-blue-100 text-blue-800',
        // House statuses
        forming: 'bg-yellow-100 text-yellow-800',
        // Notice priorities
        low: 'bg-gray-100 text-gray-800',
        normal: 'bg-blue-100 text-blue-800',
        high: 'bg-orange-100 text-orange-800',
        urgent: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get priority icon/indicator
 */
export function getPriorityIndicator(priority: string): string {
    const indicators: Record<string, string> = {
        low: '○',
        normal: '●',
        high: '◉',
        urgent: '⚠',
    };
    return indicators[priority] || '●';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/**
 * Generate a random invite code
 */
export function generateInviteCode(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
    return count === 1 ? singular : (plural || singular + 's');
}

/**
 * Calculate percentage
 */
export function percentage(part: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
}

/**
 * CN utility for class names (simplified version)
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
}
