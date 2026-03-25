import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the server action
const mockCreateListing = jest.fn()
jest.mock('../../actions', () => ({
    createListing: (formData: FormData) => mockCreateListing(formData),
}))

// Mock React's useFormStatus  
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    useFormStatus: () => ({ pending: false }),
}))

import CreateListingForm from '../CreateListingForm'

describe('CreateListingForm', () => {
    beforeEach(() => {
        mockCreateListing.mockReset()
    })

    it('renders city input', () => {
        render(<CreateListingForm />)
        expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    })

    it('renders address input', () => {
        render(<CreateListingForm />)
        expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    })

    it('renders rent input', () => {
        render(<CreateListingForm />)
        expect(screen.getByLabelText(/rent/i)).toBeInTheDocument()
    })

    it('renders available from date input', () => {
        render(<CreateListingForm />)
        expect(screen.getByLabelText(/available from/i)).toBeInTheDocument()
    })

    it('renders submit button', () => {
        render(<CreateListingForm />)
        expect(screen.getByRole('button', { name: /create listing/i })).toBeInTheDocument()
    })

    it('allows entering city', () => {
        render(<CreateListingForm />)
        
        const cityInput = screen.getByLabelText(/city/i)
        fireEvent.change(cityInput, { target: { value: 'New York' } })
        
        expect(cityInput).toHaveValue('New York')
    })

    it('allows entering address', () => {
        render(<CreateListingForm />)
        
        const addressInput = screen.getByLabelText(/address/i)
        fireEvent.change(addressInput, { target: { value: '123 Main St' } })
        
        expect(addressInput).toHaveValue('123 Main St')
    })

    it('allows entering rent amount', () => {
        render(<CreateListingForm />)
        
        const rentInput = screen.getByLabelText(/rent/i)
        fireEvent.change(rentInput, { target: { value: '1500' } })
        
        expect(rentInput).toHaveValue(1500)
    })

    it('requires city field', () => {
        render(<CreateListingForm />)
        expect(screen.getByLabelText(/city/i)).toBeRequired()
    })

    it('requires address field', () => {
        render(<CreateListingForm />)
        expect(screen.getByLabelText(/address/i)).toBeRequired()
    })

    it('requires rent field', () => {
        render(<CreateListingForm />)
        expect(screen.getByLabelText(/rent/i)).toBeRequired()
    })
})
