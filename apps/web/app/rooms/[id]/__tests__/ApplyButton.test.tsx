import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the server action
const mockCreateApplication = jest.fn()
jest.mock('@/app/applications/actions', () => ({
    createApplication: () => mockCreateApplication(),
}))

// Mock next/navigation
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        refresh: mockRefresh,
    }),
}))

// Mock React's useTransition
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useTransition: () => [false, (callback: () => void) => callback()],
}))

import ApplyButton from '../ApplyButton'

describe('ApplyButton', () => {
    beforeEach(() => {
        mockCreateApplication.mockReset()
        mockRefresh.mockReset()
    })

    const defaultProps = {
        listingId: 'test-listing-id',
    }

    it('renders apply button', () => {
        render(<ApplyButton {...defaultProps} />)
        
        expect(screen.getByRole('button', { name: /apply for this room/i })).toBeInTheDocument()
    })

    it('shows correct button text', () => {
        render(<ApplyButton {...defaultProps} />)
        
        expect(screen.getByText(/apply for this room/i)).toBeInTheDocument()
    })

    it('submits application on button click', async () => {
        mockCreateApplication.mockResolvedValue({ success: true, data: { applicationId: '123' } })
        
        render(<ApplyButton {...defaultProps} />)
        
        const button = screen.getByRole('button', { name: /apply for this room/i })
        fireEvent.click(button)
        
        await waitFor(() => {
            expect(mockCreateApplication).toHaveBeenCalled()
        })
    })

    it('shows success message after successful application', async () => {
        mockCreateApplication.mockResolvedValue({ success: true, data: { applicationId: '123' } })
        
        render(<ApplyButton {...defaultProps} />)
        
        const button = screen.getByRole('button', { name: /apply for this room/i })
        fireEvent.click(button)
        
        await waitFor(() => {
            // Component shows "Application Sent!" on success
            expect(screen.getByText(/application sent/i)).toBeInTheDocument()
        })
    })

    it('shows error message on application failure', async () => {
        mockCreateApplication.mockResolvedValue({ 
            success: false, 
            error: { message: 'Failed to submit' } 
        })
        
        render(<ApplyButton {...defaultProps} />)
        
        const button = screen.getByRole('button', { name: /apply for this room/i })
        fireEvent.click(button)
        
        await waitFor(() => {
            expect(screen.getByText(/failed to submit/i)).toBeInTheDocument()
        })
    })

    it('calls router.refresh on successful application', async () => {
        mockCreateApplication.mockResolvedValue({ success: true, data: { applicationId: '123' } })
        
        render(<ApplyButton {...defaultProps} />)
        
        const button = screen.getByRole('button', { name: /apply for this room/i })
        fireEvent.click(button)
        
        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled()
        })
    })
})
