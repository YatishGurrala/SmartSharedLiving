// House-related services for server-side operations

import { createClient } from '@/utils/supabase/server';
import { generateInviteCode } from '@/lib/utils';
import type { House, HouseMember, HouseInvite, Profile } from '@/lib/types';

/**
 * Get a house by ID with member count
 */
export async function getHouseById(houseId: string) {
    const supabase = await createClient();
    
    const { data: house, error } = await supabase
        .from('houses')
        .select('*')
        .eq('id', houseId)
        .single();

    if (error) return { house: null, error };

    // Get member count
    const { count } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', houseId);

    return { 
        house: { ...house, member_count: count || 0 } as House & { member_count: number }, 
        error: null 
    };
}

/**
 * Get house members with their profiles
 */
export async function getHouseMembers(houseId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('house_members')
        .select(`
            house_id,
            user_id,
            role,
            status,
            created_at,
            profiles!inner (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .eq('status', 'active');

    if (error) return { members: [], error };

    const members = data?.map((m: any) => ({
        ...m,
        profile: m.profiles,
    })) || [];

    return { members, error: null };
}

/**
 * Check if user is a member of a house
 */
export async function isHouseMember(houseId: string, userId: string) {
    const supabase = await createClient();
    
    const { data } = await supabase
        .from('house_members')
        .select('user_id')
        .eq('house_id', houseId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

    return !!data;
}

/**
 * Check if user is an admin of a house
 */
export async function isHouseAdmin(houseId: string, userId: string) {
    const supabase = await createClient();
    
    const { data } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

    return data?.role === 'admin';
}

/**
 * Get user's membership in a house
 */
export async function getUserMembership(houseId: string, userId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('house_members')
        .select('*')
        .eq('house_id', houseId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

    return { membership: data as HouseMember | null, error };
}

/**
 * Create a house invite
 */
export async function createHouseInvite(
    houseId: string, 
    createdBy: string, 
    options?: { email?: string; maxUses?: number; expiresDays?: number }
) {
    const supabase = await createClient();
    
    const inviteCode = generateInviteCode();
    const expiresAt = options?.expiresDays 
        ? new Date(Date.now() + options.expiresDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data, error } = await supabase
        .from('house_invites')
        .insert({
            house_id: houseId,
            invite_code: inviteCode,
            created_by: createdBy,
            email: options?.email || null,
            max_uses: options?.maxUses || 1,
            expires_at: expiresAt,
        })
        .select()
        .single();

    return { invite: data as HouseInvite | null, error };
}

/**
 * Get invite by code
 */
export async function getInviteByCode(inviteCode: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('house_invites')
        .select(`
            *,
            houses (
                id,
                city,
                target_members,
                status
            )
        `)
        .eq('invite_code', inviteCode)
        .single();

    return { invite: data, error };
}

/**
 * Use an invite to join a house
 */
export async function useInvite(inviteCode: string, userId: string) {
    const supabase = await createClient();
    
    // Get the invite
    const { invite, error: inviteError } = await getInviteByCode(inviteCode);
    
    if (inviteError || !invite) {
        return { success: false, error: 'Invalid invite code' };
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return { success: false, error: 'Invite has expired' };
    }

    // Check if max uses reached
    if (invite.uses >= invite.max_uses) {
        return { success: false, error: 'Invite has reached maximum uses' };
    }

    // Check if specific email required
    if (invite.email) {
        const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();
        
        if (user?.email !== invite.email) {
            return { success: false, error: 'This invite is for a specific email address' };
        }
    }

    // Check if already a member
    const isMember = await isHouseMember(invite.house_id, userId);
    if (isMember) {
        return { success: false, error: 'You are already a member of this house' };
    }

    // Add user as member
    const { error: memberError } = await supabase
        .from('house_members')
        .insert({
            house_id: invite.house_id,
            user_id: userId,
            role: 'member',
            status: 'active',
        });

    if (memberError) {
        return { success: false, error: 'Failed to join house' };
    }

    // Increment invite uses
    await supabase
        .from('house_invites')
        .update({ uses: invite.uses + 1 })
        .eq('id', invite.id);

    // Log activity
    await supabase.rpc('log_activity', {
        p_house_id: invite.house_id,
        p_user_id: userId,
        p_activity_type: 'member_joined',
        p_entity_type: 'house_member',
        p_entity_id: null,
        p_metadata: { invite_code: inviteCode },
    });

    return { success: true, houseId: invite.house_id, error: null };
}

/**
 * Get house invites
 */
export async function getHouseInvites(houseId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('house_invites')
        .select('*')
        .eq('house_id', houseId)
        .order('created_at', { ascending: false });

    return { invites: data as HouseInvite[] || [], error };
}

/**
 * Delete a house invite
 */
export async function deleteHouseInvite(inviteId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('house_invites')
        .delete()
        .eq('id', inviteId);

    return { success: !error, error };
}
