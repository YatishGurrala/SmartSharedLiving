// Standardized action result types and utilities for server actions

export type ActionResult<T = void> = 
    | { success: true; data: T; error?: never }
    | { success: false; error: string; data?: never; code?: ErrorCode }

export type ErrorCode = 
    | 'AUTH_REQUIRED'
    | 'NOT_AUTHORIZED'
    | 'NOT_FOUND'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'SERVER_ERROR'

export const ActionErrors = {
    AUTH_REQUIRED: 'You must be logged in to perform this action',
    NOT_AUTHORIZED: 'You do not have permission to perform this action',
    NOT_FOUND: 'The requested resource was not found',
    NOT_MEMBER: 'You are not a member of this house',
    NOT_ADMIN: 'Only admins can perform this action',
    ALREADY_EXISTS: 'This resource already exists',
    INVALID_INPUT: 'Please check your input and try again',
    SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
} as const

export function success<T>(data: T): ActionResult<T> {
    return { success: true, data }
}

export function successVoid(): ActionResult<void> {
    return { success: true, data: undefined }
}

export function failure(error: string, code?: ErrorCode): ActionResult<never> {
    return { success: false, error, code }
}

// Validation helpers
export function validateRequired(value: unknown, fieldName: string): string | null {
    if (value === null || value === undefined || value === '') {
        return `${fieldName} is required`
    }
    return null
}

export function validateMinLength(value: string, min: number, fieldName: string): string | null {
    if (value.length < min) {
        return `${fieldName} must be at least ${min} characters`
    }
    return null
}

export function validateMaxLength(value: string, max: number, fieldName: string): string | null {
    if (value.length > max) {
        return `${fieldName} must be no more than ${max} characters`
    }
    return null
}

export function validateDate(value: string, fieldName: string): string | null {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`
    }
    return null
}

export function validateFutureDate(value: string, fieldName: string): string | null {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
        return `${fieldName} must be a valid date`
    }
    if (date < new Date()) {
        return `${fieldName} must be in the future`
    }
    return null
}

export function validatePositiveNumber(value: number, fieldName: string): string | null {
    if (value <= 0) {
        return `${fieldName} must be a positive number`
    }
    return null
}

// Form data helpers
export function getFormString(formData: FormData, key: string): string {
    return (formData.get(key) as string) || ''
}

export function getFormNumber(formData: FormData, key: string): number | null {
    const value = formData.get(key)
    if (!value) return null
    const num = Number(value)
    return isNaN(num) ? null : num
}

export function getFormBoolean(formData: FormData, key: string): boolean {
    return formData.get(key) === 'true'
}

// Error message formatting
export function formatSupabaseError(error: { message?: string; code?: string }): string {
    // Common Supabase error codes with user-friendly messages
    const errorMessages: Record<string, string> = {
        '23505': 'This record already exists',
        '23503': 'Referenced record does not exist',
        '42501': 'Permission denied',
        'PGRST116': 'Record not found',
    }
    
    if (error.code && errorMessages[error.code]) {
        return errorMessages[error.code]
    }
    
    return error.message || ActionErrors.SERVER_ERROR
}
