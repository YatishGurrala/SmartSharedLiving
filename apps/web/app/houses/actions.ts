'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { generateInviteCode } from '@/lib/utils'

export async function createHouse(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return redirect('/auth/login')
    }

    const city = formData.get('city') as string
    const targetMembers = parseInt(formData.get('target_members') as string, 10)

    // Create the house
    const { data: house, error } = await supabase
        .from('houses')
        .insert({
            created_by: user.id,
            city,
            target_members: targetMembers,
            status: 'forming'
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating house:', error)
        return redirect('/houses/create?error=Could not create house')
    }

    // Add creator as admin member
    await supabase
        .from('house_members')
        .insert({
            house_id: house.id,
            user_id: user.id,
            role: 'admin',
            status: 'active'
        })

    redirect(`/houses/${house.id}`)
}

export async function inviteMember(houseId: string, inviteeEmail: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Check if user is admin of the house
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership || membership.role !== 'admin') {
        return { error: 'Not authorized' }
    }

    // Find user by email
    const { data: invitee } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteeEmail)
        .single()

    if (!invitee) {
        return { error: 'User not found' }
    }

    // Check if already a member
    const { data: existingMember } = await supabase
        .from('house_members')
        .select('user_id')
        .eq('house_id', houseId)
        .eq('user_id', invitee.id)
        .single()

    if (existingMember) {
        return { error: 'User is already a member' }
    }

    // Add as member
    const { error } = await supabase
        .from('house_members')
        .insert({
            house_id: houseId,
            user_id: invitee.id,
            role: 'member',
            status: 'active'
        })

    if (error) {
        return { error: 'Could not add member' }
    }

    return { success: true }
}

export async function leaveHouse(houseId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return redirect('/auth/login')
    }

    await supabase
        .from('house_members')
        .delete()
        .eq('house_id', houseId)
        .eq('user_id', user.id)

    redirect('/houses')
}

// ============================================
// INVITE LINK ACTIONS
// ============================================

export async function createInviteLink(houseId: string, options?: { maxUses?: number; expiresDays?: number }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Check if user is admin
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership || membership.role !== 'admin') {
        return { error: 'Not authorized' }
    }

    const inviteCode = generateInviteCode()
    const expiresAt = options?.expiresDays
        ? new Date(Date.now() + options.expiresDays * 24 * 60 * 60 * 1000).toISOString()
        : null

    const { data: invite, error } = await supabase
        .from('house_invites')
        .insert({
            house_id: houseId,
            invite_code: inviteCode,
            created_by: user.id,
            max_uses: options?.maxUses || 10,
            expires_at: expiresAt,
        })
        .select()
        .single()

    if (error) {
        return { error: 'Could not create invite' }
    }

    revalidatePath(`/houses/${houseId}`)
    return { invite, inviteCode }
}

export async function joinHouseWithCode(inviteCode: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated', redirect: '/auth/login' }
    }

    // Get the invite
    const { data: invite, error: inviteError } = await supabase
        .from('house_invites')
        .select(`
            *,
            houses (
                id,
                city,
                status
            )
        `)
        .eq('invite_code', inviteCode)
        .single()

    if (inviteError || !invite) {
        return { error: 'Invalid invite code' }
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return { error: 'Invite has expired' }
    }

    // Check if max uses reached
    if (invite.uses >= invite.max_uses) {
        return { error: 'Invite has reached maximum uses' }
    }

    // Check if already a member
    const { data: existingMember } = await supabase
        .from('house_members')
        .select('user_id')
        .eq('house_id', invite.house_id)
        .eq('user_id', user.id)
        .single()

    if (existingMember) {
        return { error: 'You are already a member of this house', houseId: invite.house_id }
    }

    // Add user as member
    const { error: memberError } = await supabase
        .from('house_members')
        .insert({
            house_id: invite.house_id,
            user_id: user.id,
            role: 'member',
            status: 'active',
        })

    if (memberError) {
        return { error: 'Failed to join house' }
    }

    // Increment invite uses
    await supabase
        .from('house_invites')
        .update({ uses: invite.uses + 1 })
        .eq('id', invite.id)

    // Log activity
    await supabase.rpc('log_activity', {
        p_house_id: invite.house_id,
        p_user_id: user.id,
        p_activity_type: 'member_joined',
        p_entity_type: 'house_member',
        p_entity_id: null,
        p_metadata: { invite_code: inviteCode },
    })

    return { success: true, houseId: invite.house_id }
}

export async function getHouseInvites(houseId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { invites: [], error: 'Not authenticated' }
    }

    const { data: invites, error } = await supabase
        .from('house_invites')
        .select('*')
        .eq('house_id', houseId)
        .order('created_at', { ascending: false })

    return { invites: invites || [], error: error?.message }
}

export async function deleteInvite(inviteId: string, houseId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Check if user is admin
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership || membership.role !== 'admin') {
        return { error: 'Not authorized' }
    }

    const { error } = await supabase
        .from('house_invites')
        .delete()
        .eq('id', inviteId)

    if (error) {
        return { error: 'Could not delete invite' }
    }

    revalidatePath(`/houses/${houseId}`)
    return { success: true }
}
