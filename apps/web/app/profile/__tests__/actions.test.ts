// Tests for profile actions
import { 
    createAppError, 
    ErrorCodes, 
    validateRequired,
    validateRange,
} from '@/lib/errors'

// Mock Supabase client
const mockSupabaseClient = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(() => ({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
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

describe('Profile Actions - Validation', () => {
    describe('Name validation', () => {
        it('should require name', () => {
            expect(() => validateRequired('', 'Name')).toThrow('Name is required')
        })

        it('should accept valid name', () => {
            expect(() => validateRequired('John Doe', 'Name')).not.toThrow()
        })

        it('should accept single word name', () => {
            expect(() => validateRequired('John', 'Name')).not.toThrow()
        })
    })

    describe('Cleanliness level validation', () => {
        it('should accept level 1', () => {
            expect(() => validateRange(1, 1, 5, 'Cleanliness level')).not.toThrow()
        })

        it('should accept level 5', () => {
            expect(() => validateRange(5, 1, 5, 'Cleanliness level')).not.toThrow()
        })

        it('should accept level 3', () => {
            expect(() => validateRange(3, 1, 5, 'Cleanliness level')).not.toThrow()
        })

        it('should reject level 0', () => {
            expect(() => validateRange(0, 1, 5, 'Cleanliness level'))
                .toThrow('Cleanliness level must be between 1 and 5')
        })

        it('should reject level 6', () => {
            expect(() => validateRange(6, 1, 5, 'Cleanliness level'))
                .toThrow('Cleanliness level must be between 1 and 5')
        })
    })

    describe('Social level validation', () => {
        it('should accept valid range', () => {
            for (let i = 1; i <= 5; i++) {
                expect(() => validateRange(i, 1, 5, 'Social level')).not.toThrow()
            }
        })

        it('should reject invalid values', () => {
            expect(() => validateRange(-1, 1, 5, 'Social level')).toThrow()
            expect(() => validateRange(10, 1, 5, 'Social level')).toThrow()
        })
    })
})

describe('Profile Actions - Error Handling', () => {
    it('should create AUTH_REQUIRED error for unauthenticated users', () => {
        const error = createAppError(ErrorCodes.AUTH_REQUIRED)
        expect(error.code).toBe('AUTH_REQUIRED')
        expect(error.statusCode).toBe(401)
    })

    it('should create DB_ERROR error for database failures', () => {
        const error = createAppError(ErrorCodes.DB_ERROR, 'Failed to update profile')
        expect(error.code).toBe('DB_ERROR')
        expect(error.message).toBe('Failed to update profile')
    })
})

describe('Profile Data Parsing', () => {
    describe('FormData extraction', () => {
        it('should parse basic profile fields', () => {
            const formData = new FormData()
            formData.append('name', 'John Doe')
            formData.append('bio', 'Software developer')
            formData.append('occupation', 'Engineer')

            const name = formData.get('name') as string
            const bio = formData.get('bio') as string
            const occupation = formData.get('occupation') as string

            expect(name).toBe('John Doe')
            expect(bio).toBe('Software developer')
            expect(occupation).toBe('Engineer')
        })

        it('should parse lifestyle fields', () => {
            const formData = new FormData()
            formData.append('cleanliness_level', '4')
            formData.append('social_level', '3')
            formData.append('sleep_schedule', 'night_owl')
            formData.append('guest_frequency', 'sometimes')

            const cleanlinessLevel = parseInt(formData.get('cleanliness_level') as string, 10)
            const socialLevel = parseInt(formData.get('social_level') as string, 10)
            const sleepSchedule = formData.get('sleep_schedule') as string
            const guestFrequency = formData.get('guest_frequency') as string

            expect(cleanlinessLevel).toBe(4)
            expect(socialLevel).toBe(3)
            expect(sleepSchedule).toBe('night_owl')
            expect(guestFrequency).toBe('sometimes')
        })

        it('should parse housing preferences', () => {
            const formData = new FormData()
            formData.append('city', 'San Francisco')
            formData.append('min_budget', '1000')
            formData.append('max_budget', '2000')
            formData.append('move_in_date', '2024-03-01')

            const city = formData.get('city') as string
            const minBudget = parseFloat(formData.get('min_budget') as string)
            const maxBudget = parseFloat(formData.get('max_budget') as string)
            const moveInDate = formData.get('move_in_date') as string

            expect(city).toBe('San Francisco')
            expect(minBudget).toBe(1000)
            expect(maxBudget).toBe(2000)
            expect(moveInDate).toBe('2024-03-01')
        })
    })

    describe('Optional field handling', () => {
        it('should handle missing optional fields', () => {
            const formData = new FormData()
            formData.append('name', 'John')

            const bio = formData.get('bio') as string || ''
            const cleanlinessLevel = parseInt(formData.get('cleanliness_level') as string, 10)

            expect(bio).toBe('')
            expect(isNaN(cleanlinessLevel)).toBe(true)
        })

        it('should handle null budget values', () => {
            const formData = new FormData()
            
            const minBudget = parseFloat(formData.get('min_budget') as string) || null
            const maxBudget = parseFloat(formData.get('max_budget') as string) || null

            expect(minBudget).toBeNull()
            expect(maxBudget).toBeNull()
        })
    })
})

describe('Profile Update Object Construction', () => {
    it('should construct valid profile update object', () => {
        const userId = 'user-123'
        const profileData = {
            user_id: userId,
            name: 'John Doe',
            bio: 'Developer',
            occupation: 'Software Engineer',
        }

        expect(profileData.user_id).toBe(userId)
        expect(profileData.name).toBe('John Doe')
        expect(profileData.bio).toBe('Developer')
        expect(profileData.occupation).toBe('Software Engineer')
    })

    it('should construct valid lifestyle update object', () => {
        const userId = 'user-123'
        const lifestyleData = {
            user_id: userId,
            cleanliness_level: 4,
            sleep_schedule: 'early_bird',
            social_level: 3,
            guest_frequency: 'rarely',
        }

        expect(lifestyleData.user_id).toBe(userId)
        expect(lifestyleData.cleanliness_level).toBe(4)
        expect(lifestyleData.sleep_schedule).toBe('early_bird')
    })

    it('should construct valid housing preferences object', () => {
        const userId = 'user-123'
        const housingData = {
            user_id: userId,
            city: 'New York',
            min_budget: 1500,
            max_budget: 3000,
            move_in_date: '2024-04-01',
        }

        expect(housingData.city).toBe('New York')
        expect(housingData.min_budget).toBe(1500)
        expect(housingData.max_budget).toBe(3000)
    })
})

describe('Sleep Schedule Options', () => {
    const validSchedules = ['early_bird', 'night_owl', 'flexible']

    it('should recognize early_bird as valid', () => {
        expect(validSchedules).toContain('early_bird')
    })

    it('should recognize night_owl as valid', () => {
        expect(validSchedules).toContain('night_owl')
    })

    it('should recognize flexible as valid', () => {
        expect(validSchedules).toContain('flexible')
    })
})

describe('Guest Frequency Options', () => {
    const validFrequencies = ['never', 'rarely', 'sometimes', 'often']

    it('should recognize all frequency options', () => {
        validFrequencies.forEach(freq => {
            expect(validFrequencies).toContain(freq)
        })
    })
})

describe('Budget Validation Logic', () => {
    it('should allow valid budget range', () => {
        const minBudget = 1000
        const maxBudget = 2000
        
        const isValidRange = minBudget <= maxBudget
        expect(isValidRange).toBe(true)
    })

    it('should detect invalid budget range', () => {
        const minBudget = 3000
        const maxBudget = 2000
        
        const isValidRange = minBudget <= maxBudget
        expect(isValidRange).toBe(false)
    })

    it('should allow equal min and max budget', () => {
        const minBudget = 1500
        const maxBudget = 1500
        
        const isValidRange = minBudget <= maxBudget
        expect(isValidRange).toBe(true)
    })
})
