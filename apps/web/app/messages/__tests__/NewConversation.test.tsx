import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock server actions
const mockStartConversation = jest.fn()
jest.mock('../actions', () => ({
    startConversation: (recipientId: string, message: string) => mockStartConversation(recipientId, message),
}))

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: jest.fn(),
    }),
}))

import NewConversation from '../NewConversation'

describe('NewConversation', () => {
    const defaultProps = {
        recipientId: 'recipient-123',
        recipientName: 'Jane Doe',
    }

    beforeEach(() => {
        mockStartConversation.mockReset()
        mockPush.mockReset()
    })

    it('renders recipient name', () => {
        render(<NewConversation {...defaultProps} />)
        
        expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument()
    })

    it('renders message input', () => {
        render(<NewConversation {...defaultProps} />)
        
        expect(screen.getByPlaceholderText(/message/i)).toBeInTheDocument()
    })

    it('renders send button', () => {
        render(<NewConversation {...defaultProps} />)
        
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('allows entering a message', () => {
        render(<NewConversation {...defaultProps} />)
        
        const input = screen.getByPlaceholderText(/message/i)
        fireEvent.change(input, { target: { value: 'Hello Jane!' } })
        
        expect(input).toHaveValue('Hello Jane!')
    })

    it('shows start conversation header', () => {
        render(<NewConversation {...defaultProps} />)
        
        expect(screen.getByText(/start conversation with/i)).toBeInTheDocument()
    })

    it('button is disabled when message is empty', () => {
        render(<NewConversation {...defaultProps} />)
        
        const button = screen.getByRole('button', { name: /send/i })
        expect(button).toBeDisabled()
    })

    it('button is enabled when message has content', () => {
        render(<NewConversation {...defaultProps} />)
        
        const input = screen.getByPlaceholderText(/message/i)
        fireEvent.change(input, { target: { value: 'Hello!' } })
        
        const button = screen.getByRole('button', { name: /send/i })
        expect(button).not.toBeDisabled()
    })
})
