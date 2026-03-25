// Error handling utilities for the application

export class AppError extends Error {
    public readonly code: string
    public readonly statusCode: number
    public readonly isOperational: boolean

    constructor(
        message: string,
        code = 'UNKNOWN_ERROR',
        statusCode = 500,
        isOperational = true
    ) {
        super(message)
        this.code = code
        this.statusCode = statusCode
        this.isOperational = isOperational
        Error.captureStackTrace(this, this.constructor)
    }
}

export const ErrorCodes = {
    // Authentication errors
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    AUTH_INVALID: 'AUTH_INVALID',
    AUTH_EXPIRED: 'AUTH_EXPIRED',

    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',

    // Resource errors
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',

    // Permission errors
    FORBIDDEN: 'FORBIDDEN',
    NOT_AUTHORIZED: 'NOT_AUTHORIZED',

    // Database errors
    DB_ERROR: 'DB_ERROR',
    DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',

    // Server errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

export function createAppError(
    code: ErrorCode,
    message?: string,
    statusCode?: number
): AppError {
    const defaultMessages: Record<ErrorCode, string> = {
        [ErrorCodes.AUTH_REQUIRED]: 'Authentication required',
        [ErrorCodes.AUTH_INVALID]: 'Invalid credentials',
        [ErrorCodes.AUTH_EXPIRED]: 'Session expired',
        [ErrorCodes.VALIDATION_ERROR]: 'Validation error',
        [ErrorCodes.INVALID_INPUT]: 'Invalid input provided',
        [ErrorCodes.NOT_FOUND]: 'Resource not found',
        [ErrorCodes.ALREADY_EXISTS]: 'Resource already exists',
        [ErrorCodes.CONFLICT]: 'Resource conflict',
        [ErrorCodes.FORBIDDEN]: 'Access forbidden',
        [ErrorCodes.NOT_AUTHORIZED]: 'Not authorized to perform this action',
        [ErrorCodes.DB_ERROR]: 'Database error occurred',
        [ErrorCodes.DB_CONNECTION_ERROR]: 'Database connection error',
        [ErrorCodes.INTERNAL_ERROR]: 'Internal server error',
        [ErrorCodes.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
    }

    const defaultStatusCodes: Record<ErrorCode, number> = {
        [ErrorCodes.AUTH_REQUIRED]: 401,
        [ErrorCodes.AUTH_INVALID]: 401,
        [ErrorCodes.AUTH_EXPIRED]: 401,
        [ErrorCodes.VALIDATION_ERROR]: 400,
        [ErrorCodes.INVALID_INPUT]: 400,
        [ErrorCodes.NOT_FOUND]: 404,
        [ErrorCodes.ALREADY_EXISTS]: 409,
        [ErrorCodes.CONFLICT]: 409,
        [ErrorCodes.FORBIDDEN]: 403,
        [ErrorCodes.NOT_AUTHORIZED]: 403,
        [ErrorCodes.DB_ERROR]: 500,
        [ErrorCodes.DB_CONNECTION_ERROR]: 503,
        [ErrorCodes.INTERNAL_ERROR]: 500,
        [ErrorCodes.SERVICE_UNAVAILABLE]: 503,
    }

    return new AppError(
        message || defaultMessages[code],
        code,
        statusCode || defaultStatusCodes[code]
    )
}

// Type-safe result pattern for operations
export type Result<T, E = AppError> =
    | { success: true; data: T }
    | { success: false; error: E }

export function ok<T>(data: T): Result<T> {
    return { success: true, data }
}

export function err<E = AppError>(error: E): Result<never, E> {
    return { success: false, error }
}

// Safe wrapper for async operations
export async function tryCatch<T>(
    fn: () => Promise<T>,
    errorHandler?: (error: unknown) => AppError
): Promise<Result<T>> {
    try {
        const data = await fn()
        return ok(data)
    } catch (error) {
        if (errorHandler) {
            return err(errorHandler(error))
        }
        if (error instanceof AppError) {
            return err(error)
        }
        return err(
            createAppError(
                ErrorCodes.INTERNAL_ERROR,
                error instanceof Error ? error.message : 'Unknown error'
            )
        )
    }
}

// Logging utility for errors
export function logError(error: unknown, context?: Record<string, unknown>): void {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        ...(error instanceof AppError
            ? {
                  message: error.message,
                  code: error.code,
                  statusCode: error.statusCode,
                  stack: error.stack,
              }
            : error instanceof Error
            ? {
                  message: error.message,
                  stack: error.stack,
              }
            : { message: String(error) }),
        context,
    }

    console.error('[ERROR]', JSON.stringify(errorInfo, null, 2))
}

// Input validation helpers
export function validateRequired<T>(
    value: T | null | undefined,
    fieldName: string
): asserts value is T {
    if (value === null || value === undefined || value === '') {
        throw createAppError(
            ErrorCodes.VALIDATION_ERROR,
            `${fieldName} is required`
        )
    }
}

export function validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        throw createAppError(ErrorCodes.VALIDATION_ERROR, 'Invalid email format')
    }
}

export function validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
): void {
    if (value < min || value > max) {
        throw createAppError(
            ErrorCodes.VALIDATION_ERROR,
            `${fieldName} must be between ${min} and ${max}`
        )
    }
}

export function validatePositive(value: number, fieldName: string): void {
    if (value <= 0) {
        throw createAppError(
            ErrorCodes.VALIDATION_ERROR,
            `${fieldName} must be a positive number`
        )
    }
}
