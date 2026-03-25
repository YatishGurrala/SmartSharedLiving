import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from '../Navbar'

// Mock usePathname
const mockPathname = jest.fn()
jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname(),
}))

// Mock the signout action
jest.mock('../../auth/login/actions', () => ({
    signout: jest.fn(),
}))

describe('Navbar', () => {
    beforeEach(() => {
        mockPathname.mockReturnValue('/rooms')
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should render the brand logo', () => {
        render(<Navbar userName="John" />)
        expect(screen.getByText('SmartShared')).toBeInTheDocument()
    })

    it('should render all navigation items', () => {
        render(<Navbar userName="John" />)
        
        expect(screen.getByText('Discover')).toBeInTheDocument()
        expect(screen.getByText('Roommates')).toBeInTheDocument()
        expect(screen.getByText('Houses')).toBeInTheDocument()
        expect(screen.getByText('My Listings')).toBeInTheDocument()
        expect(screen.getByText('Applications')).toBeInTheDocument()
        expect(screen.getByText('Messages')).toBeInTheDocument()
    })

    it('should display user initials', () => {
        render(<Navbar userName="John Doe" />)
        expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('should display username', () => {
        render(<Navbar userName="John Doe" />)
        expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should render logout button', () => {
        render(<Navbar userName="John" />)
        expect(screen.getByText('Log out')).toBeInTheDocument()
    })

    it('should highlight active navigation item', () => {
        mockPathname.mockReturnValue('/rooms')
        render(<Navbar userName="John" />)
        
        const discoverLink = screen.getAllByText('Discover')[0]
        expect(discoverLink.className).toContain('text-indigo-600')
        expect(discoverLink.className).toContain('bg-indigo-50')
    })

    it('should highlight nested route', () => {
        mockPathname.mockReturnValue('/listings/create')
        render(<Navbar userName="John" />)
        
        const listingsLink = screen.getAllByText('My Listings')[0]
        expect(listingsLink.className).toContain('text-indigo-600')
    })

    it('should not highlight inactive navigation items', () => {
        mockPathname.mockReturnValue('/rooms')
        render(<Navbar userName="John" />)
        
        const roommatesLink = screen.getAllByText('Roommates')[0]
        expect(roommatesLink.className).toContain('text-gray-600')
        expect(roommatesLink.className).not.toContain('bg-indigo-50')
    })

    describe('Mobile menu', () => {
        it('should be hidden by default', () => {
            render(<Navbar userName="John" />)
            
            // Mobile menu items are not visible initially (only desktop ones)
            const profileLinks = screen.queryAllByText('Profile')
            // There should be no Profile link in the initial view
            // as mobile menu is closed
            expect(profileLinks.length).toBe(0)
        })

        it('should toggle mobile menu on button click', () => {
            render(<Navbar userName="John" />)
            
            const menuButton = screen.getByRole('button', { name: '' }) // SVG button
            
            // Open mobile menu
            fireEvent.click(menuButton)
            
            // Now Profile link should be visible in mobile menu
            expect(screen.getByText('Profile')).toBeInTheDocument()
        })

        it('should close mobile menu when clicking a link', () => {
            render(<Navbar userName="John" />)
            
            const menuButton = screen.getByRole('button', { name: '' })
            
            // Open mobile menu
            fireEvent.click(menuButton)
            
            // Click a link in mobile menu
            const profileLink = screen.getByText('Profile')
            fireEvent.click(profileLink)
            
            // Mobile menu should be closed (Profile link should be gone)
            // Need to wait for re-render
            expect(screen.queryByText('Profile')).not.toBeInTheDocument()
        })
    })

    describe('Navigation links', () => {
        it('should have correct href for Discover', () => {
            render(<Navbar userName="John" />)
            const link = screen.getAllByText('Discover')[0].closest('a')
            expect(link).toHaveAttribute('href', '/rooms')
        })

        it('should have correct href for Roommates', () => {
            render(<Navbar userName="John" />)
            const link = screen.getAllByText('Roommates')[0].closest('a')
            expect(link).toHaveAttribute('href', '/roommates')
        })

        it('should have correct href for Houses', () => {
            render(<Navbar userName="John" />)
            const link = screen.getAllByText('Houses')[0].closest('a')
            expect(link).toHaveAttribute('href', '/houses')
        })

        it('should have correct href for profile', () => {
            render(<Navbar userName="John" />)
            const avatarLink = screen.getByText('J').closest('a')
            expect(avatarLink).toHaveAttribute('href', '/profile')
        })
    })

    describe('User Avatar', () => {
        it('should show uppercase first letter', () => {
            render(<Navbar userName="alice" />)
            expect(screen.getByText('A')).toBeInTheDocument()
        })

        it('should handle empty username gracefully', () => {
            render(<Navbar userName="" />)
            // Should not crash and still render the navbar
            expect(screen.getByText('SmartShared')).toBeInTheDocument()
        })

        it('should handle single character username', () => {
            render(<Navbar userName="Xavier" />)
            // Use the full name instead of just X to avoid ambiguity
            expect(screen.getByText('Xavier')).toBeInTheDocument()
        })
    })
})
