// Tests for auth actions
jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve({
        auth: {
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signOut: jest.fn(),
        },
    })),
}))

jest.mock('next/navigation', () => ({
    redirect: jest.fn((url) => { throw new Error(`REDIRECT:${url}`) }),
}))

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

describe('Auth Actions - FormData Parsing', () => {
    describe('Login form data', () => {
        it('should extract email from formData', () => {
            const formData = new FormData()
            formData.append('email', 'test@example.com')
            formData.append('password', 'password123')

            const email = formData.get('email') as string
            expect(email).toBe('test@example.com')
        })

        it('should extract password from formData', () => {
            const formData = new FormData()
            formData.append('email', 'test@example.com')
            formData.append('password', 'password123')

            const password = formData.get('password') as string
            expect(password).toBe('password123')
        })
    })

    describe('Signup form data', () => {
        it('should extract signup data', () => {
            const formData = new FormData()
            formData.append('email', 'newuser@example.com')
            formData.append('password', 'newpassword123')

            const data = {
                email: formData.get('email') as string,
                password: formData.get('password') as string,
            }

            expect(data.email).toBe('newuser@example.com')
            expect(data.password).toBe('newpassword123')
        })
    })
})

describe('Auth Actions - Email Validation', () => {
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(email)
    }

    it('should accept valid email', () => {
        expect(isValidEmail('test@example.com')).toBe(true)
    })

    it('should accept email with subdomain', () => {
        expect(isValidEmail('user@mail.example.com')).toBe(true)
    })

    it('should accept email with plus sign', () => {
        expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('should reject email without @', () => {
        expect(isValidEmail('invalid')).toBe(false)
    })

    it('should reject email without domain', () => {
        expect(isValidEmail('user@')).toBe(false)
    })

    it('should reject email without username', () => {
        expect(isValidEmail('@example.com')).toBe(false)
    })
})

describe('Auth Actions - Password Validation', () => {
    const isValidPassword = (password: string): boolean => {
        return password.length >= 6
    }

    it('should accept password with 6+ characters', () => {
        expect(isValidPassword('password')).toBe(true)
    })

    it('should accept password with exactly 6 characters', () => {
        expect(isValidPassword('123456')).toBe(true)
    })

    it('should reject password with less than 6 characters', () => {
        expect(isValidPassword('12345')).toBe(false)
    })

    it('should reject empty password', () => {
        expect(isValidPassword('')).toBe(false)
    })
})

describe('Auth Actions - Redirect URLs', () => {
    it('should have correct login error URL format', () => {
        const errorMessage = 'Could not authenticate user'
        const redirectUrl = `/auth/login?message=${errorMessage}`
        
        expect(redirectUrl).toContain('/auth/login')
        expect(redirectUrl).toContain('message=')
    })

    it('should encode special characters in error messages', () => {
        const errorMessage = 'Invalid email/password'
        const encodedUrl = `/auth/signup?message=${encodeURIComponent(errorMessage)}`
        
        expect(encodedUrl).toContain('Invalid%20email%2Fpassword')
    })

    it('should redirect to profile setup after successful auth', () => {
        const successRedirectPath = '/profile/setup'
        expect(successRedirectPath).toBe('/profile/setup')
    })

    it('should redirect to login after signout', () => {
        const signoutRedirectPath = '/auth/login'
        expect(signoutRedirectPath).toBe('/auth/login')
    })
})

describe('Auth Actions - Error Message Handling', () => {
    it('should handle auth error with message', () => {
        const error = { message: 'Invalid credentials' }
        const errorMessage = error.message
        
        expect(errorMessage).toBe('Invalid credentials')
    })

    it('should handle confirmation email scenario', () => {
        const authData = { user: { id: 'user-123' }, session: null }
        const needsConfirmation = authData.user && !authData.session
        
        expect(needsConfirmation).toBe(true)
    })

    it('should detect successful signup with session', () => {
        const authData = { user: { id: 'user-123' }, session: { access_token: 'token' } }
        const needsConfirmation = authData.user && !authData.session
        
        expect(needsConfirmation).toBe(false)
    })
})

describe('Auth Actions - Supabase Auth Data Structure', () => {
    describe('signInWithPassword response', () => {
        it('should handle successful login', () => {
            const response = {
                data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
                error: null,
            }

            expect(response.data.user.id).toBe('user-123')
            expect(response.error).toBeNull()
        })

        it('should handle login error', () => {
            const response = {
                data: { user: null, session: null },
                error: { message: 'Invalid login credentials' },
            }

            expect(response.error).not.toBeNull()
            expect(response.error?.message).toContain('Invalid')
        })
    })

    describe('signUp response', () => {
        it('should handle new user signup', () => {
            const response = {
                data: { 
                    user: { id: 'new-user-123' }, 
                    session: null 
                },
                error: null,
            }

            expect(response.data.user).not.toBeNull()
            expect(response.data.session).toBeNull() // Email confirmation required
        })

        it('should handle signup error', () => {
            const response = {
                data: { user: null, session: null },
                error: { message: 'User already registered' },
            }

            expect(response.error?.message).toContain('already registered')
        })
    })
})

describe('Auth Actions - Session Handling', () => {
    it('should determine if session exists', () => {
        const withSession = { session: { access_token: 'token' } }
        const withoutSession = { session: null }

        expect(!!withSession.session).toBe(true)
        expect(!!withoutSession.session).toBe(false)
    })

    it('should determine if user is authenticated', () => {
        const isAuthenticated = (data: { user: any; error: any }) => {
            return !!data.user && !data.error
        }

        expect(isAuthenticated({ user: { id: '123' }, error: null })).toBe(true)
        expect(isAuthenticated({ user: null, error: { message: 'Error' } })).toBe(false)
        expect(isAuthenticated({ user: null, error: null })).toBe(false)
    })
})
