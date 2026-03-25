// Tests for action-utils module
import {
    ActionErrors,
    validateRequired,
    validateMinLength,
    validateMaxLength,
    validateDate,
    validateFutureDate,
    validatePositiveNumber,
    getFormString,
    getFormNumber,
    getFormBoolean,
    formatSupabaseError,
    success,
    failure,
} from '../action-utils'

describe('ActionErrors', () => {
    it('should have all error constants defined', () => {
        expect(ActionErrors.AUTH_REQUIRED).toBe('You must be logged in to perform this action')
        expect(ActionErrors.NOT_FOUND).toBe('The requested resource was not found')
        expect(ActionErrors.NOT_AUTHORIZED).toBe('You do not have permission to perform this action')
        expect(ActionErrors.NOT_MEMBER).toBe('You are not a member of this house')
        expect(ActionErrors.NOT_ADMIN).toBe('Only admins can perform this action')
        expect(ActionErrors.INVALID_INPUT).toBe('Please check your input and try again')
        expect(ActionErrors.SERVER_ERROR).toBe('An unexpected error occurred. Please try again later.')
    })
})

describe('validateRequired', () => {
    it('should return error for null value', () => {
        expect(validateRequired(null, 'Title')).toBe('Title is required')
    })

    it('should return error for undefined value', () => {
        expect(validateRequired(undefined, 'Title')).toBe('Title is required')
    })

    it('should return error for empty string', () => {
        expect(validateRequired('', 'Title')).toBe('Title is required')
    })

    it('should return null for whitespace string (treated as valid)', () => {
        expect(validateRequired('   ', 'Title')).toBeNull()
    })

    it('should return null for valid string', () => {
        expect(validateRequired('Valid Title', 'Title')).toBeNull()
    })
})

describe('validateMinLength', () => {
    it('should return null for value meeting min length', () => {
        expect(validateMinLength('abc', 3, 'Field')).toBeNull()
    })

    it('should return null for value exceeding min length', () => {
        expect(validateMinLength('abcdef', 3, 'Field')).toBeNull()
    })

    it('should return error for value below min length', () => {
        expect(validateMinLength('ab', 3, 'Field')).toBe('Field must be at least 3 characters')
    })

    it('should return error for empty string', () => {
        expect(validateMinLength('', 3, 'Field')).toBe('Field must be at least 3 characters')
    })
})

describe('validateMaxLength', () => {
    it('should return null for value within max length', () => {
        expect(validateMaxLength('short', 200, 'Field')).toBeNull()
    })

    it('should return null for value at exact max length', () => {
        expect(validateMaxLength('a'.repeat(200), 200, 'Field')).toBeNull()
    })

    it('should return error for value exceeding max length', () => {
        expect(validateMaxLength('a'.repeat(201), 200, 'Field')).toBe('Field must be no more than 200 characters')
    })

    it('should return null for empty string', () => {
        expect(validateMaxLength('', 200, 'Field')).toBeNull()
    })
})

describe('validateDate', () => {
    it('should return null for valid date', () => {
        expect(validateDate('2024-01-15', 'Date')).toBeNull()
    })

    it('should return error for invalid date', () => {
        expect(validateDate('invalid', 'Date')).toBe('Date must be a valid date')
    })

    it('should return error for empty string', () => {
        expect(validateDate('', 'Date')).toBe('Date must be a valid date')
    })
})

describe('validateFutureDate', () => {
    it('should return null for future date', () => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        expect(validateFutureDate(tomorrow.toISOString().split('T')[0], 'Date')).toBeNull()
    })

    it('should return error for past date', () => {
        expect(validateFutureDate('2020-01-01', 'Date')).toBe('Date must be in the future')
    })

    it('should return error for invalid date string', () => {
        expect(validateFutureDate('invalid', 'Date')).toBe('Date must be a valid date')
    })
})

describe('validatePositiveNumber', () => {
    it('should return null for positive number', () => {
        expect(validatePositiveNumber(100, 'Amount')).toBeNull()
    })

    it('should return null for decimal positive number', () => {
        expect(validatePositiveNumber(50.5, 'Amount')).toBeNull()
    })

    it('should return error for zero', () => {
        expect(validatePositiveNumber(0, 'Amount')).toBe('Amount must be a positive number')
    })

    it('should return error for negative number', () => {
        expect(validatePositiveNumber(-10, 'Amount')).toBe('Amount must be a positive number')
    })

    it('should return error for small decimal', () => {
        expect(validatePositiveNumber(0.001, 'Amount')).toBeNull()
    })
})

describe('getFormString', () => {
    it('should extract string value from FormData', () => {
        const formData = new FormData()
        formData.append('name', 'Test Value')
        
        expect(getFormString(formData, 'name')).toBe('Test Value')
    })

    it('should return empty string for missing field', () => {
        const formData = new FormData()
        
        expect(getFormString(formData, 'name')).toBe('')
    })

    it('should return empty string for empty value', () => {
        const formData = new FormData()
        formData.append('name', '')
        
        expect(getFormString(formData, 'name')).toBe('')
    })
})

describe('getFormNumber', () => {
    it('should extract number value from FormData', () => {
        const formData = new FormData()
        formData.append('amount', '100')
        
        expect(getFormNumber(formData, 'amount')).toBe(100)
    })

    it('should extract decimal number from FormData', () => {
        const formData = new FormData()
        formData.append('amount', '99.99')
        
        expect(getFormNumber(formData, 'amount')).toBe(99.99)
    })

    it('should return null for missing field', () => {
        const formData = new FormData()
        
        expect(getFormNumber(formData, 'amount')).toBeNull()
    })

    it('should return null for non-numeric value', () => {
        const formData = new FormData()
        formData.append('amount', 'not-a-number')
        
        expect(getFormNumber(formData, 'amount')).toBeNull()
    })
})

describe('getFormBoolean', () => {
    it('should return true for "true" string', () => {
        const formData = new FormData()
        formData.append('enabled', 'true')
        
        expect(getFormBoolean(formData, 'enabled')).toBe(true)
    })

    it('should return false for "on" string', () => {
        const formData = new FormData()
        formData.append('enabled', 'on')
        
        expect(getFormBoolean(formData, 'enabled')).toBe(false)
    })

    it('should return false for "1" string', () => {
        const formData = new FormData()
        formData.append('enabled', '1')
        
        expect(getFormBoolean(formData, 'enabled')).toBe(false)
    })

    it('should return false for "false" string', () => {
        const formData = new FormData()
        formData.append('enabled', 'false')
        
        expect(getFormBoolean(formData, 'enabled')).toBe(false)
    })

    it('should return false for missing field', () => {
        const formData = new FormData()
        
        expect(getFormBoolean(formData, 'enabled')).toBe(false)
    })
})

describe('formatSupabaseError', () => {
    it('should return default message for generic error', () => {
        const error = { message: 'Something went wrong' }
        expect(formatSupabaseError(error)).toBe('Something went wrong')
    })

    it('should format unique constraint violation', () => {
        const error = { 
            code: '23505',
            message: 'duplicate key value violates unique constraint'
        }
        expect(formatSupabaseError(error)).toContain('already exists')
    })

    it('should format foreign key violation', () => {
        const error = {
            code: '23503',
            message: 'insert or update on table violates foreign key constraint'
        }
        expect(formatSupabaseError(error)).toContain('does not exist')
    })

    it('should return default message for unknown codes', () => {
        const error = {
            code: '23502',
            message: 'null value in column violates not-null constraint'
        }
        // Unknown code returns the message as-is
        expect(formatSupabaseError(error)).toBe('null value in column violates not-null constraint')
    })

    it('should handle error without message', () => {
        const error = { code: 'unknown' }
        expect(formatSupabaseError(error)).toBe('An unexpected error occurred. Please try again later.')
    })
})

describe('success helper', () => {
    it('should return success result with data', () => {
        const data = { id: '123', name: 'Test' }
        const result = success(data)
        
        expect(result.data).toEqual(data)
        expect(result.error).toBeUndefined()
    })
})

describe('failure helper', () => {
    it('should return failure result with error', () => {
        const result = failure('Something went wrong')
        
        expect(result.error).toBe('Something went wrong')
        expect(result.data).toBeUndefined()
    })
})

describe('Form Data Utilities Integration', () => {
    it('should handle complete form data extraction', () => {
        const formData = new FormData()
        formData.append('title', 'Test Title')
        formData.append('amount', '150.50')
        formData.append('enabled', 'true')
        formData.append('date', '2024-12-31')
        
        const extracted = {
            title: getFormString(formData, 'title'),
            amount: getFormNumber(formData, 'amount'),
            enabled: getFormBoolean(formData, 'enabled'),
            date: getFormString(formData, 'date'),
        }
        
        expect(extracted.title).toBe('Test Title')
        expect(extracted.amount).toBe(150.50)
        expect(extracted.enabled).toBe(true)
        expect(extracted.date).toBe('2024-12-31')
    })

    it('should handle form data with missing fields', () => {
        const formData = new FormData()
        formData.append('title', 'Only Title')
        
        const extracted = {
            title: getFormString(formData, 'title'),
            amount: getFormNumber(formData, 'amount'),
            enabled: getFormBoolean(formData, 'enabled'),
        }
        
        expect(extracted.title).toBe('Only Title')
        expect(extracted.amount).toBeNull()
        expect(extracted.enabled).toBe(false)
    })
})

describe('Validation Chain', () => {
    it('should validate all fields in sequence', () => {
        const title = 'ab'
        const content = ''
        
        // Title too short
        const titleError = validateRequired(title, 'Title') || validateMinLength(title, 3, 'Title')
        expect(titleError).toBe('Title must be at least 3 characters')
        
        // Content required
        const contentError = validateRequired(content, 'Content')
        expect(contentError).toBe('Content is required')
    })

    it('should pass validation for valid fields', () => {
        const title = 'Valid Title'
        const content = 'Some content here'
        
        const titleError = validateRequired(title, 'Title') || validateMinLength(title, 3, 'Title') || validateMaxLength(title, 200, 'Title')
        const contentError = validateRequired(content, 'Content')
        
        expect(titleError).toBeNull()
        expect(contentError).toBeNull()
    })
})
