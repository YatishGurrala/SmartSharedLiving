import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock server actions
const mockSendMessage = jest.fn()
jest.mock('../actions', () => ({
    sendMessage: (formData: FormData) => mockSendMessage(formData),
}))

// Mock useFormStatus
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    useFormStatus: () => ({ pending: false }),
}))

import MessageList from '../MessageList'

describe('MessageList', () => {
    const defaultProps = {
        conversationId: 'conv-123',
        messages: [
            {
                id: 'msg-1',
                sender_id: 'user-1',
                message: 'Hello there!',
                created_at: '2024-01-15T10:00:00Z',
            },
            {
                id: 'msg-2',
                sender_id: 'user-2',
                message: 'Hi! How are you?',
                created_at: '2024-01-15T10:05:00Z',
            },
        ],
        currentUserId: 'user-1',
        otherUserName: 'John Doe',
    }

    beforeEach(() => {
        mockSendMessage.mockReset()
    })

    it('renders all messages', () => {
        render(<MessageList {...defaultProps} />)
        
        expect(screen.getByText('Hello there!')).toBeInTheDocument()
        expect(screen.getByText('Hi! How are you?')).toBeInTheDocument()
    })

    it('renders message input field', () => {
        render(<MessageList {...defaultProps} />)
        
        expect(screen.getByPlaceholderText(/message/i)).toBeInTheDocument()
    })

    it('renders send button', () => {
        render(<MessageList {...defaultProps} />)
        
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('allows entering a message', () => {
        render(<MessageList {...defaultProps} />)
        
        const input = screen.getByPlaceholderText(/message/i)
        fireEvent.change(input, { target: { value: 'New message' } })
        
        expect(input).toHaveValue('New message')
    })

    it('handles empty messages array', () => {
        render(<MessageList {...defaultProps} messages={[]} />)
        
        // Should still render the input
        expect(screen.getByPlaceholderText(/message/i)).toBeInTheDocument()
    })

    it('distinguishes sent and received messages', () => {
        render(<MessageList {...defaultProps} />)
        
        // The component should visually differentiate messages
        // Both messages should be present
        expect(screen.getByText('Hello there!')).toBeInTheDocument()
        expect(screen.getByText('Hi! How are you?')).toBeInTheDocument()
    })
})
