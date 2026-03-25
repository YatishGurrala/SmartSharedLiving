import { login, signup, signout } from '../actions'

// Mock dependencies
const mockSignInWithPassword = jest.fn()
const mockSignUp = jest.fn()
const mockSignOut = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve({
        auth: {
            signInWithPassword: mockSignInWithPassword,
            signUp: mockSignUp,
            signOut: mockSignOut,
        },
    })),
}))

const mockRedirect = jest.fn()
const mockRevalidatePath = jest.fn()

jest.mock('next/cache', () => ({
    revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

jest.mock('next/navigation', () => ({
    redirect: (...args: unknown[]) => mockRedirect(...args),
}))

describe('Auth Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('login', () => {
        it('should redirect to error on authentication failure', async () => {
            mockSignInWithPassword.mockResolvedValue({
                error: new Error('Invalid credentials'),
            })

            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'wrongpassword')

            await login(formData)

            expect(mockSignInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'wrongpassword',
            })
            expect(mockRedirect).toHaveBeenCalledWith('/auth/login?message=Could not authenticate user')
        })

        it('should redirect to profile setup on successful login', async () => {
            mockSignInWithPassword.mockResolvedValue({ error: null })

            const formData = new FormData()
            formData.set('email', 'test@example.com')
            formData.set('password', 'correctpassword')

            await login(formData)

            expect(mockSignInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'correctpassword',
            })
            expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
            expect(mockRedirect).toHaveBeenCalledWith('/profile/setup')
        })

        it('should handle empty email gracefully', async () => {
            mockSignInWithPassword.mockResolvedValue({
                error: new Error('Email required'),
            })

            const formData = new FormData()
            formData.set('email', '')
            formData.set('password', 'password')

            await login(formData)

            expect(mockRedirect).toHaveBeenCalledWith('/auth/login?message=Could not authenticate user')
        })
    })

    describe('signup', () => {
        it('should redirect to error on signup failure', async () => {
            const errorMessage = 'Email already registered'
            mockSignUp.mockResolvedValue({
                data: { user: null, session: null },
                error: { message: errorMessage },
            })

            const formData = new FormData()
            formData.set('email', 'existing@example.com')
            formData.set('password', 'password123')

            await signup(formData)

            expect(mockSignUp).toHaveBeenCalledWith({
                email: 'existing@example.com',
                password: 'password123',
            })
            expect(mockRedirect).toHaveBeenCalledWith(`/auth/signup?message=${encodeURIComponent(errorMessage)}`)
        })

        it('should redirect to confirm email when user created but no session', async () => {
            mockSignUp.mockResolvedValue({
                data: { user: { id: 'user-123' }, session: null },
                error: null,
            })

            const formData = new FormData()
            formData.set('email', 'new@example.com')
            formData.set('password', 'password123')

            await signup(formData)

            expect(mockRedirect).toHaveBeenCalledWith('/auth/signup?message=Check your email to confirm your account')
        })

        it('should redirect to profile setup on successful signup with session', async () => {
            mockSignUp.mockResolvedValue({
                data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
                error: null,
            })

            const formData = new FormData()
            formData.set('email', 'new@example.com')
            formData.set('password', 'password123')

            await signup(formData)

            expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
            expect(mockRedirect).toHaveBeenCalledWith('/profile/setup')
        })

        it('should redirect to profile setup when no user returned', async () => {
            mockSignUp.mockResolvedValue({
                data: { user: null, session: null },
                error: null,
            })

            const formData = new FormData()
            formData.set('email', 'new@example.com')
            formData.set('password', 'password123')

            await signup(formData)

            expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
            expect(mockRedirect).toHaveBeenCalledWith('/profile/setup')
        })
    })

    describe('signout', () => {
        it('should sign out and redirect to login', async () => {
            mockSignOut.mockResolvedValue({ error: null })

            await signout()

            expect(mockSignOut).toHaveBeenCalled()
            expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
        })
    })
})
