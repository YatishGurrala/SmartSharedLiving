import {
    AppError,
    ErrorCodes,
    createAppError,
    ok,
    err,
    tryCatch,
    logError,
    validateRequired,
    validateEmail,
    validateRange,
    validatePositive,
    type Result,
} from '../errors'

describe('AppError', () => {
    it('should create an error with default values', () => {
        const error = new AppError('Test error')
        expect(error.message).toBe('Test error')
        expect(error.code).toBe('UNKNOWN_ERROR')
        expect(error.statusCode).toBe(500)
        expect(error.isOperational).toBe(true)
    })

    it('should create an error with custom values', () => {
        const error = new AppError('Custom error', 'CUSTOM_CODE', 404, false)
        expect(error.message).toBe('Custom error')
        expect(error.code).toBe('CUSTOM_CODE')
        expect(error.statusCode).toBe(404)
        expect(error.isOperational).toBe(false)
    })

    it('should be an instance of Error', () => {
        const error = new AppError('Test')
        expect(error).toBeInstanceOf(Error)
        expect(error).toBeInstanceOf(AppError)
    })
})

describe('createAppError', () => {
    it('should create error with default message for AUTH_REQUIRED', () => {
        const error = createAppError(ErrorCodes.AUTH_REQUIRED)
        expect(error.code).toBe('AUTH_REQUIRED')
        expect(error.message).toBe('Authentication required')
        expect(error.statusCode).toBe(401)
    })

    it('should create error with default message for NOT_FOUND', () => {
        const error = createAppError(ErrorCodes.NOT_FOUND)
        expect(error.code).toBe('NOT_FOUND')
        expect(error.message).toBe('Resource not found')
        expect(error.statusCode).toBe(404)
    })

    it('should create error with custom message', () => {
        const error = createAppError(ErrorCodes.VALIDATION_ERROR, 'Email is invalid')
        expect(error.code).toBe('VALIDATION_ERROR')
        expect(error.message).toBe('Email is invalid')
        expect(error.statusCode).toBe(400)
    })

    it('should create error with custom status code', () => {
        const error = createAppError(ErrorCodes.INTERNAL_ERROR, undefined, 503)
        expect(error.statusCode).toBe(503)
    })

    it('should handle all error codes', () => {
        Object.values(ErrorCodes).forEach((code) => {
            const error = createAppError(code)
            expect(error.code).toBe(code)
            expect(error.message).toBeTruthy()
            expect(error.statusCode).toBeGreaterThanOrEqual(400)
        })
    })
})

describe('Result type helpers', () => {
    describe('ok', () => {
        it('should create a success result', () => {
            const result = ok({ data: 'test' })
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toEqual({ data: 'test' })
            }
        })

        it('should handle various data types', () => {
            expect(ok(null).success).toBe(true)
            expect(ok(undefined).success).toBe(true)
            expect(ok(123).success).toBe(true)
            expect(ok('string').success).toBe(true)
            expect(ok([1, 2, 3]).success).toBe(true)
        })
    })

    describe('err', () => {
        it('should create an error result', () => {
            const error = new AppError('Test error')
            const result = err(error)
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.error).toBe(error)
            }
        })
    })
})

describe('tryCatch', () => {
    it('should return ok result on success', async () => {
        const result = await tryCatch(async () => ({ value: 42 }))
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toEqual({ value: 42 })
        }
    })

    it('should return err result on AppError', async () => {
        const appError = createAppError(ErrorCodes.NOT_FOUND)
        const result = await tryCatch(async () => {
            throw appError
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toBe(appError)
        }
    })

    it('should wrap regular errors in AppError', async () => {
        const result = await tryCatch(async () => {
            throw new Error('Regular error')
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toBeInstanceOf(AppError)
            expect(result.error.message).toBe('Regular error')
            expect(result.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
        }
    })

    it('should use custom error handler when provided', async () => {
        const customError = createAppError(ErrorCodes.VALIDATION_ERROR, 'Custom handling')
        const result = await tryCatch(
            async () => {
                throw new Error('Original')
            },
            () => customError
        )
        expect(result.success).toBe(false)
        if (!result.success) {
            expect(result.error).toBe(customError)
        }
    })

    it('should handle non-Error throws', async () => {
        const result = await tryCatch(async () => {
            throw 'string error'
        })
        expect(result.success).toBe(false)
        if (!result.success) {
            // Non-Error throws become 'Unknown error' per implementation
            expect(result.error.message).toBe('Unknown error')
            expect(result.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
        }
    })
})

describe('logError', () => {
    let consoleSpy: jest.SpyInstance

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
        consoleSpy.mockRestore()
    })

    it('should log AppError with all properties', () => {
        const error = new AppError('Test', 'TEST_CODE', 500)
        logError(error, { userId: '123' })
        
        expect(consoleSpy).toHaveBeenCalledWith(
            '[ERROR]',
            expect.stringContaining('TEST_CODE')
        )
        expect(consoleSpy).toHaveBeenCalledWith(
            '[ERROR]',
            expect.stringContaining('userId')
        )
    })

    it('should log regular Error', () => {
        const error = new Error('Regular error')
        logError(error)
        
        expect(consoleSpy).toHaveBeenCalledWith(
            '[ERROR]',
            expect.stringContaining('Regular error')
        )
    })

    it('should log non-Error values', () => {
        logError('string error')
        
        expect(consoleSpy).toHaveBeenCalledWith(
            '[ERROR]',
            expect.stringContaining('string error')
        )
    })
})

describe('Validation helpers', () => {
    describe('validateRequired', () => {
        it('should not throw for valid values', () => {
            expect(() => validateRequired('test', 'Field')).not.toThrow()
            expect(() => validateRequired(0, 'Field')).not.toThrow()
            expect(() => validateRequired(false, 'Field')).not.toThrow()
            expect(() => validateRequired({}, 'Field')).not.toThrow()
        })

        it('should throw for null', () => {
            expect(() => validateRequired(null, 'Field')).toThrow(AppError)
            expect(() => validateRequired(null, 'Field')).toThrow('Field is required')
        })

        it('should throw for undefined', () => {
            expect(() => validateRequired(undefined, 'Field')).toThrow(AppError)
        })

        it('should throw for empty string', () => {
            expect(() => validateRequired('', 'Field')).toThrow(AppError)
        })
    })

    describe('validateEmail', () => {
        it('should not throw for valid emails', () => {
            expect(() => validateEmail('test@example.com')).not.toThrow()
            expect(() => validateEmail('user.name@domain.co.uk')).not.toThrow()
            expect(() => validateEmail('user+tag@domain.com')).not.toThrow()
        })

        it('should throw for invalid emails', () => {
            expect(() => validateEmail('invalid')).toThrow(AppError)
            expect(() => validateEmail('invalid@')).toThrow(AppError)
            expect(() => validateEmail('@domain.com')).toThrow(AppError)
            expect(() => validateEmail('test@domain')).toThrow(AppError)
        })
    })

    describe('validateRange', () => {
        it('should not throw for values in range', () => {
            expect(() => validateRange(5, 1, 10, 'Value')).not.toThrow()
            expect(() => validateRange(1, 1, 10, 'Value')).not.toThrow()
            expect(() => validateRange(10, 1, 10, 'Value')).not.toThrow()
        })

        it('should throw for values below range', () => {
            expect(() => validateRange(0, 1, 10, 'Value')).toThrow(AppError)
            expect(() => validateRange(0, 1, 10, 'Value')).toThrow('Value must be between 1 and 10')
        })

        it('should throw for values above range', () => {
            expect(() => validateRange(11, 1, 10, 'Value')).toThrow(AppError)
        })
    })

    describe('validatePositive', () => {
        it('should not throw for positive numbers', () => {
            expect(() => validatePositive(1, 'Amount')).not.toThrow()
            expect(() => validatePositive(0.1, 'Amount')).not.toThrow()
            expect(() => validatePositive(1000, 'Amount')).not.toThrow()
        })

        it('should throw for zero', () => {
            expect(() => validatePositive(0, 'Amount')).toThrow(AppError)
            expect(() => validatePositive(0, 'Amount')).toThrow('Amount must be a positive number')
        })

        it('should throw for negative numbers', () => {
            expect(() => validatePositive(-1, 'Amount')).toThrow(AppError)
            expect(() => validatePositive(-0.1, 'Amount')).toThrow(AppError)
        })
    })
})
