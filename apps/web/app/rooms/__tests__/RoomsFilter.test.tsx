import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
        push: mockPush,
        refresh: jest.fn(),
    })),
    useSearchParams: jest.fn(() => ({
        get: jest.fn(),
    })),
}))

// Mock React's useTransition
jest.mock('react', () => ({
    ...jest.requireActual('react'),
    useTransition: () => [false, (callback: () => void) => callback()],
}))

// Import after mocks
import RoomsFilter from '../RoomsFilter'

describe('RoomsFilter', () => {
    const defaultProps = {
        cities: ['San Francisco', 'New York', 'Los Angeles'],
        currentFilters: {
            city: '',
            minRent: '',
            maxRent: '',
        },
    }

    beforeEach(() => {
        mockPush.mockReset()
    })

    it('renders all filter fields', () => {
        render(<RoomsFilter {...defaultProps} />)
        
        expect(screen.getByText(/location/i)).toBeInTheDocument()
        expect(screen.getByText(/min rent/i)).toBeInTheDocument()
        expect(screen.getByText(/max rent/i)).toBeInTheDocument()
    })

    it('renders with initial values', () => {
        render(
            <RoomsFilter 
                cities={['San Francisco', 'New York']}
                currentFilters={{
                    city: 'San Francisco',
                    minRent: '1000',
                    maxRent: '2000',
                }}
            />
        )
        
        expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument()
        expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
        expect(screen.getByDisplayValue('2000')).toBeInTheDocument()
    })

    it('renders search button', () => {
        render(<RoomsFilter {...defaultProps} />)
        
        expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    })

    it('shows city options from props', () => {
        render(<RoomsFilter {...defaultProps} />)
        
        // Cities appear in select dropdown
        const select = screen.getByRole('combobox')
        expect(select).toBeInTheDocument()
    })

    it('shows clear button when filters are active', () => {
        render(
            <RoomsFilter 
                cities={['Test City']}
                currentFilters={{
                    city: 'Test City',
                    minRent: '',
                    maxRent: '',
                }}
            />
        )
        
        expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('allows clearing filters', () => {
        render(
            <RoomsFilter 
                cities={['Test City']}
                currentFilters={{
                    city: 'Test City',
                    minRent: '500',
                    maxRent: '1500',
                }}
            />
        )
        
        const clearButton = screen.getByRole('button', { name: /clear/i })
        fireEvent.click(clearButton)
        
        expect(mockPush).toHaveBeenCalledWith('/rooms')
    })

    it('does not show clear button when no filters are active', () => {
        render(<RoomsFilter {...defaultProps} />)
        
        expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })
})
