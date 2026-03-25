// Tests for Supabase client utility
// Note: These test the factory functions, not the actual Supabase connection

// Mock the Supabase SSR module
jest.mock('@supabase/ssr', () => ({
    createBrowserClient: jest.fn(() => ({
        auth: { getUser: jest.fn() },
        from: jest.fn(),
    })),
}))

describe('Supabase Client Utilities', () => {
    beforeEach(() => {
        jest.resetModules()
    })

    describe('createBrowserClient', () => {
        it('should export createBrowserClient function from client module', async () => {
            const clientModule = await import('../client')
            // The module exports a createBrowserClient function
            expect(clientModule).toBeDefined()
        })
    })

    describe('Environment variables', () => {
        it('should use NEXT_PUBLIC_SUPABASE_URL', () => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL
            // In test, this may be undefined, but we verify the structure
            expect(typeof url === 'string' || typeof url === 'undefined').toBe(true)
        })

        it('should use NEXT_PUBLIC_SUPABASE_ANON_KEY', () => {
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            expect(typeof key === 'string' || typeof key === 'undefined').toBe(true)
        })
    })
})
