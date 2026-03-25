// Tests for listing actions
import { 
    createAppError, 
    ErrorCodes, 
    validateRequired, 
    validatePositive 
} from '@/lib/errors'

// Mock Supabase client
const mockSupabaseClient = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
    })),
}

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

jest.mock('next/navigation', () => ({
    redirect: jest.fn((url) => { throw new Error(`REDIRECT:${url}`) }),
}))

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

jest.mock('@/lib/analytics', () => ({
    trackServerEvent: jest.fn(),
}))

describe('Listing Actions - Validation Tests', () => {
    describe('validateRequired', () => {
        it('should pass for valid city', () => {
            expect(() => validateRequired('San Francisco', 'City')).not.toThrow()
        })

        it('should throw for empty city', () => {
            expect(() => validateRequired('', 'City')).toThrow('City is required')
        })

        it('should throw for null value', () => {
            expect(() => validateRequired(null, 'Address')).toThrow('Address is required')
        })
    })

    describe('validatePositive', () => {
        it('should pass for positive rent', () => {
            expect(() => validatePositive(1500, 'Rent')).not.toThrow()
        })

        it('should throw for zero rent', () => {
            expect(() => validatePositive(0, 'Rent')).toThrow('Rent must be a positive number')
        })

        it('should throw for negative rent', () => {
            expect(() => validatePositive(-100, 'Rent')).toThrow()
        })
    })
})

describe('Listing Actions - Error Handling', () => {
    describe('createAppError', () => {
        it('should create AUTH_REQUIRED error', () => {
            const error = createAppError(ErrorCodes.AUTH_REQUIRED)
            expect(error.code).toBe('AUTH_REQUIRED')
            expect(error.statusCode).toBe(401)
        })

        it('should create NOT_AUTHORIZED error', () => {
            const error = createAppError(ErrorCodes.NOT_AUTHORIZED, 'You can only edit your own listings')
            expect(error.code).toBe('NOT_AUTHORIZED')
            expect(error.message).toBe('You can only edit your own listings')
            expect(error.statusCode).toBe(403)
        })

        it('should create DB_ERROR error', () => {
            const error = createAppError(ErrorCodes.DB_ERROR, 'Failed to create listing')
            expect(error.code).toBe('DB_ERROR')
            expect(error.statusCode).toBe(500)
        })

        it('should create NOT_FOUND error', () => {
            const error = createAppError(ErrorCodes.NOT_FOUND, 'Listing not found')
            expect(error.code).toBe('NOT_FOUND')
            expect(error.statusCode).toBe(404)
        })

        it('should create VALIDATION_ERROR error', () => {
            const error = createAppError(ErrorCodes.VALIDATION_ERROR, 'Invalid rent amount')
            expect(error.code).toBe('VALIDATION_ERROR')
            expect(error.statusCode).toBe(400)
        })
    })
})

describe('Listing Data Validation', () => {
    it('should validate listing creation data', () => {
        const validData = {
            city: 'San Francisco',
            address: '123 Market St',
            rent: 2500,
            availableFrom: '2024-02-01',
            roomCount: 2,
        }

        expect(() => {
            validateRequired(validData.city, 'City')
            validateRequired(validData.address, 'Address')
            validateRequired(validData.availableFrom, 'Available from date')
            validatePositive(validData.rent, 'Rent')
            validatePositive(validData.roomCount, 'Number of rooms')
        }).not.toThrow()
    })

    it('should reject invalid listing data', () => {
        expect(() => validateRequired('', 'City')).toThrow()
        expect(() => validatePositive(0, 'Rent')).toThrow()
        expect(() => validatePositive(-1, 'Number of rooms')).toThrow()
    })

    it('should handle edge cases', () => {
        // Minimum valid rent
        expect(() => validatePositive(0.01, 'Rent')).not.toThrow()
        
        // Single room
        expect(() => validatePositive(1, 'Rooms')).not.toThrow()
        
        // City with special characters
        expect(() => validateRequired("San José", 'City')).not.toThrow()
    })
})

describe('Room rent calculation', () => {
    it('should calculate individual room rent correctly', () => {
        const totalRent = 3000
        const roomCount = 3
        const expectedRoomRent = totalRent / roomCount

        expect(expectedRoomRent).toBe(1000)
    })

    it('should handle uneven splits', () => {
        const totalRent = 2500
        const roomCount = 3
        const roomRent = totalRent / roomCount

        expect(roomRent).toBeCloseTo(833.33, 2)
    })

    it('should handle single room', () => {
        const totalRent = 1500
        const roomCount = 1
        const roomRent = totalRent / roomCount

        expect(roomRent).toBe(1500)
    })
})

describe('FormData parsing', () => {
    it('should parse valid form data', () => {
        const formData = new FormData()
        formData.append('city', 'Los Angeles')
        formData.append('address', '456 Sunset Blvd')
        formData.append('rent', '2000')
        formData.append('available_from', '2024-03-01')
        formData.append('room_count', '2')

        const city = formData.get('city') as string
        const rent = parseFloat(formData.get('rent') as string)
        const roomCount = parseInt(formData.get('room_count') as string, 10)

        expect(city).toBe('Los Angeles')
        expect(rent).toBe(2000)
        expect(roomCount).toBe(2)
    })

    it('should handle NaN for invalid numbers', () => {
        const formData = new FormData()
        formData.append('rent', 'invalid')

        const rent = parseFloat(formData.get('rent') as string)
        expect(isNaN(rent)).toBe(true)
    })

    it('should parse room-specific rents', () => {
        const formData = new FormData()
        formData.append('room_1_rent', '1200')
        formData.append('room_2_rent', '1000')

        const room1Rent = parseFloat(formData.get('room_1_rent') as string)
        const room2Rent = parseFloat(formData.get('room_2_rent') as string)

        expect(room1Rent).toBe(1200)
        expect(room2Rent).toBe(1000)
    })
})
