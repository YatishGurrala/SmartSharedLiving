import { sendMessage } from '../actions'

// Mock Supabase
jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve({
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id', email: 'test@test.com' } },
                error: null,
            }),
        },
        from: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'new-message-id' }, error: null }),
        }),
    })),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}))

// Mock next/cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

describe('Messages Actions', () => {
    describe('sendMessage', () => {
        it('should be a function', () => {
            expect(typeof sendMessage).toBe('function')
        })

        it('should handle form data with message', async () => {
            const formData = new FormData()
            formData.append('message', 'Hello, interested in the room!')
            formData.append('conversationId', 'test-conv-id')
            
            await expect(sendMessage(formData)).resolves.not.toThrow()
        })

        it('should handle empty message gracefully', async () => {
            const formData = new FormData()
            formData.append('message', '')
            formData.append('conversationId', 'test-conv-id')
            
            await expect(sendMessage(formData)).resolves.not.toThrow()
        })
    })
})
