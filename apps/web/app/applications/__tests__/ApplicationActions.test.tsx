import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the server action
const mockUpdateApplicationStatus = jest.fn()
jest.mock('../actions', () => ({
    updateApplicationStatus: (...args: any[]) => mockUpdateApplicationStatus(...args),
}))

// Mock React's useTransition
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useTransition: () => [false, (callback: () => Promise<void>) => callback()],
}))

import ApplicationActions from '../ApplicationActions'

describe('ApplicationActions', () => {
    beforeEach(() => {
        mockUpdateApplicationStatus.mockReset()
    })

    const defaultProps = {
        applicationId: 'test-app-id',
    }

    it('renders accept and reject buttons', () => {
        render(<ApplicationActions {...defaultProps} />)
        
        expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
    })

    it('calls updateApplicationStatus with accepted when accept clicked', async () => {
        mockUpdateApplicationStatus.mockResolvedValue({ success: true, data: { success: true } })
        
        render(<ApplicationActions {...defaultProps} />)
        
        const acceptButton = screen.getByRole('button', { name: /accept/i })
        fireEvent.click(acceptButton)
        
        await waitFor(() => {
            expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('test-app-id', 'accepted')
        })
    })

    it('calls updateApplicationStatus with rejected when reject clicked', async () => {
        mockUpdateApplicationStatus.mockResolvedValue({ success: true, data: { success: true } })
        
        render(<ApplicationActions {...defaultProps} />)
        
        const rejectButton = screen.getByRole('button', { name: /reject/i })
        fireEvent.click(rejectButton)
        
        await waitFor(() => {
            expect(mockUpdateApplicationStatus).toHaveBeenCalledWith('test-app-id', 'rejected')
        })
    })

    it('shows Updated! message on successful action', async () => {
        mockUpdateApplicationStatus.mockResolvedValue({ success: true, data: { success: true } })
        
        render(<ApplicationActions {...defaultProps} />)
        
        const acceptButton = screen.getByRole('button', { name: /accept/i })
        fireEvent.click(acceptButton)
        
        await waitFor(() => {
            expect(screen.getByText(/updated/i)).toBeInTheDocument()
        })
    })

    it('shows error message on failed action', async () => {
        mockUpdateApplicationStatus.mockResolvedValue({ 
            success: false, 
            error: { message: 'Not authorized' } 
        })
        
        render(<ApplicationActions {...defaultProps} />)
        
        const acceptButton = screen.getByRole('button', { name: /accept/i })
        fireEvent.click(acceptButton)
        
        await waitFor(() => {
            expect(screen.getByText(/not authorized/i)).toBeInTheDocument()
        })
    })

    it('handles unexpected errors gracefully', async () => {
        mockUpdateApplicationStatus.mockRejectedValue(new Error('Network error'))
        
        render(<ApplicationActions {...defaultProps} />)
        
        const acceptButton = screen.getByRole('button', { name: /accept/i })
        fireEvent.click(acceptButton)
        
        await waitFor(() => {
            expect(screen.getByText(/unexpected error/i)).toBeInTheDocument()
        })
    })
})
