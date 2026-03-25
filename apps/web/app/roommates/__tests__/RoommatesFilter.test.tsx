import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
        push: mockPush,
        refresh: jest.fn(),
    })),
}))

// Mock React's useTransition
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useTransition: () => [false, (callback: () => void) => callback()],
}))

// Import after mocks
import RoommatesFilter from '../RoommatesFilter'

describe('RoommatesFilter', () => {
    const defaultProps = {
        cities: ['San Francisco', 'New York', 'Los Angeles'],
        currentFilters: {
            city: '',
            minBudget: '',
            maxBudget: '',
        },
    }

    beforeEach(() => {
        mockPush.mockReset()
    })

    it('renders all filter fields', () => {
        render(<RoommatesFilter {...defaultProps} />)
        
        expect(screen.getByText(/city/i)).toBeInTheDocument()
        expect(screen.getByText(/min budget/i)).toBeInTheDocument()
        expect(screen.getByText(/max budget/i)).toBeInTheDocument()
    })

    it('renders with initial values', () => {
        render(
            <RoommatesFilter 
                cities={['Los Angeles', 'Chicago']}
                currentFilters={{
                    city: 'Los Angeles',
                    minBudget: '800',
                    maxBudget: '1800',
                }}
            />
        )
        
        expect(screen.getByDisplayValue('Los Angeles')).toBeInTheDocument()
        expect(screen.getByDisplayValue('800')).toBeInTheDocument()
        expect(screen.getByDisplayValue('1800')).toBeInTheDocument()
    })

    it('renders search button', () => {
        render(<RoommatesFilter {...defaultProps} />)
        
        expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('shows city select dropdown', () => {
        render(<RoommatesFilter {...defaultProps} />)
        
        const select = screen.getByRole('combobox')
        expect(select).toBeInTheDocument()
    })

    it('shows clear button when filters are active', () => {
        render(
            <RoommatesFilter 
                cities={['Chicago']}
                currentFilters={{
                    city: 'Chicago',
                    minBudget: '',
                    maxBudget: '',
                }}
            />
        )
        
        expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('clears filters when clear button clicked', () => {
        render(
            <RoommatesFilter 
                cities={['Chicago']}
                currentFilters={{
                    city: 'Chicago',
                    minBudget: '600',
                    maxBudget: '1200',
                }}
            />
        )
        
        const clearButton = screen.getByRole('button', { name: /clear/i })
        fireEvent.click(clearButton)
        
        expect(mockPush).toHaveBeenCalledWith('/roommates')
    })

    it('does not show clear button when no filters are active', () => {
        render(<RoommatesFilter {...defaultProps} />)
        
        expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })
})
