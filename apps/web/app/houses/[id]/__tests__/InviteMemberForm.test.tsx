import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the server action
const mockInviteMember = jest.fn()
jest.mock('../../actions', () => ({
    inviteMember: (houseId: string, email: string) => mockInviteMember(houseId, email),
}))

import InviteMemberForm from '../InviteMemberForm'

describe('InviteMemberForm', () => {
    beforeEach(() => {
        mockInviteMember.mockReset()
    })

    const defaultProps = {
        houseId: 'test-house-id',
    }

    it('renders email input field', () => {
        render(<InviteMemberForm {...defaultProps} />)
        expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    })

    it('renders invite button', () => {
        render(<InviteMemberForm {...defaultProps} />)
        expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument()
    })

    it('allows entering email address', () => {
        render(<InviteMemberForm {...defaultProps} />)
        
        const emailInput = screen.getByPlaceholderText(/email/i)
        fireEvent.change(emailInput, { target: { value: 'newmember@test.com' } })
        
        expect(emailInput).toHaveValue('newmember@test.com')
    })

    it('renders help text', () => {
        render(<InviteMemberForm {...defaultProps} />)
        
        expect(screen.getByText(/user must have an account/i)).toBeInTheDocument()
    })

    it('validates email is required', () => {
        render(<InviteMemberForm {...defaultProps} />)
        
        const emailInput = screen.getByPlaceholderText(/email/i)
        expect(emailInput).toBeRequired()
    })

    it('submits form and shows success message', async () => {
        mockInviteMember.mockResolvedValue({ error: null })
        
        render(<InviteMemberForm {...defaultProps} />)
        
        const emailInput = screen.getByPlaceholderText(/email/i)
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        
        const submitButton = screen.getByRole('button', { name: /invite/i })
        fireEvent.click(submitButton)
        
        await waitFor(() => {
            expect(screen.getByText(/invited successfully/i)).toBeInTheDocument()
        })
    })

    it('submits form and shows error message on failure', async () => {
        mockInviteMember.mockResolvedValue({ error: 'User not found' })
        
        render(<InviteMemberForm {...defaultProps} />)
        
        const emailInput = screen.getByPlaceholderText(/email/i)
        fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } })
        
        const submitButton = screen.getByRole('button', { name: /invite/i })
        fireEvent.click(submitButton)
        
        await waitFor(() => {
            expect(screen.getByText(/user not found/i)).toBeInTheDocument()
        })
    })
})
