'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { 
    createAppError, 
    ErrorCodes, 
    logError, 
    validateRequired, 
    validatePositive,
    tryCatch,
    type Result 
} from '@/lib/errors'
import { trackServerEvent } from '@/lib/analytics'

interface CreateListingData {
    city: string
    address: string
    rent: number
    availableFrom: string
    rooms: { rent: number }[]
}

export async function createListing(formData: FormData): Promise<void> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        logError(authError, { action: 'createListing', step: 'auth' })
        redirect('/auth/login?error=Please sign in to create a listing')
    }

    try {
        // Validate inputs
        const city = formData.get('city') as string
        const address = formData.get('address') as string
        const rent = parseFloat(formData.get('rent') as string)
        const availableFrom = formData.get('available_from') as string
        const roomCount = parseInt(formData.get('room_count') as string, 10)

        validateRequired(city, 'City')
        validateRequired(address, 'Address')
        validateRequired(availableFrom, 'Available from date')
        validatePositive(rent, 'Rent')
        validatePositive(roomCount, 'Number of rooms')

        // Create listing
        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .insert({
                owner_id: user.id,
                city,
                address,
                rent,
                available_from: availableFrom,
            })
            .select()
            .single()

        if (listingError || !listing) {
            logError(listingError, { action: 'createListing', step: 'insert_listing' })
            throw createAppError(ErrorCodes.DB_ERROR, 'Failed to create listing')
        }

        // Create rooms
        const rooms = []
        for (let i = 1; i <= roomCount; i++) {
            const roomRent = parseFloat(formData.get(`room_${i}_rent`) as string) || rent / roomCount
            rooms.push({
                listing_id: listing.id,
                rent: roomRent,
                available: true,
            })
        }

        if (rooms.length > 0) {
            const { error: roomsError } = await supabase
                .from('rooms')
                .insert(rooms)

            if (roomsError) {
                logError(roomsError, { action: 'createListing', step: 'insert_rooms' })
                // Rollback listing if rooms fail
                await supabase.from('listings').delete().eq('id', listing.id)
                throw createAppError(ErrorCodes.DB_ERROR, 'Failed to create rooms')
            }
        }

        // Track analytics
        trackServerEvent({
            category: 'listing',
            action: 'created',
            label: city,
            value: rent,
            metadata: { listingId: listing.id, roomCount },
        })

        revalidatePath('/rooms')
        revalidatePath('/listings')
    } catch (error) {
        logError(error, { action: 'createListing' })
        redirect('/listings/create?error=Failed to create listing. Please try again.')
    }

    redirect('/listings')
}

export async function updateListing(
    listingId: string,
    formData: FormData
): Promise<Result<{ success: boolean }>> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: createAppError(ErrorCodes.AUTH_REQUIRED) }
    }

    return tryCatch(async () => {
        // Verify ownership
        const { data: existing } = await supabase
            .from('listings')
            .select('owner_id')
            .eq('id', listingId)
            .single()

        if (!existing || existing.owner_id !== user.id) {
            throw createAppError(ErrorCodes.NOT_AUTHORIZED, 'You can only edit your own listings')
        }

        const city = formData.get('city') as string
        const address = formData.get('address') as string
        const rent = parseFloat(formData.get('rent') as string)
        const availableFrom = formData.get('available_from') as string

        const { error } = await supabase
            .from('listings')
            .update({
                city,
                address,
                rent,
                available_from: availableFrom,
            })
            .eq('id', listingId)

        if (error) {
            throw createAppError(ErrorCodes.DB_ERROR, 'Failed to update listing')
        }

        revalidatePath('/rooms')
        revalidatePath('/listings')
        revalidatePath(`/listings/${listingId}`)

        return { success: true }
    })
}

export async function deleteListing(listingId: string): Promise<void> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/auth/login')
    }

    try {
        // Verify ownership
        const { data: existing } = await supabase
            .from('listings')
            .select('owner_id')
            .eq('id', listingId)
            .single()

        if (!existing || existing.owner_id !== user.id) {
            throw createAppError(ErrorCodes.NOT_AUTHORIZED)
        }

        // Delete rooms first (cascade should handle this, but being explicit)
        await supabase.from('rooms').delete().eq('listing_id', listingId)

        // Delete listing
        const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', listingId)

        if (error) {
            throw createAppError(ErrorCodes.DB_ERROR)
        }

        trackServerEvent({
            category: 'listing',
            action: 'deleted',
            metadata: { listingId },
        })

        revalidatePath('/rooms')
        revalidatePath('/listings')
    } catch (error) {
        logError(error, { action: 'deleteListing', listingId })
    }

    redirect('/listings')
}

export async function toggleRoomAvailability(
    roomId: string,
    available: boolean
): Promise<Result<{ success: boolean }>> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: createAppError(ErrorCodes.AUTH_REQUIRED) }
    }

    return tryCatch(async () => {
        // Verify ownership through listing
        const { data: room } = await supabase
            .from('rooms')
            .select('listing_id, listings(owner_id)')
            .eq('id', roomId)
            .single()

        if (!room || (room.listings as any)?.owner_id !== user.id) {
            throw createAppError(ErrorCodes.NOT_AUTHORIZED)
        }

        const { error } = await supabase
            .from('rooms')
            .update({ available })
            .eq('id', roomId)

        if (error) {
            throw createAppError(ErrorCodes.DB_ERROR)
        }

        revalidatePath('/listings')
        return { success: true }
    })
}
