// Exit Request services for server-side operations

import { createClient } from '@/utils/supabase/server';
import type { ExitRequest, ExitRequestWithUser, ExitRequestStatus } from '@/lib/types';

/**
 * Get all exit requests for a house
 */
export async function getHouseExitRequests(houseId: string, status?: ExitRequestStatus) {
    const supabase = await createClient();
    
    let query = supabase
        .from('exit_requests')
        .select(`
            *,
            user:user_id (
                id,
                user_id,
                name,
                avatar
            ),
            reviewer:reviewed_by (
                id,
                user_id,
                name
            )
        `)
        .eq('house_id', houseId);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return { requests: [], error };

    const requests = data?.map((r: any) => ({
        ...r,
        user: r.user,
        reviewer: r.reviewer,
    })) as ExitRequestWithUser[];

    return { requests, error: null };
}

/**
 * Get a single exit request by ID
 */
export async function getExitRequestById(requestId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('exit_requests')
        .select(`
            *,
            user:user_id (
                id,
                user_id,
                name,
                avatar
            ),
            reviewer:reviewed_by (
                id,
                user_id,
                name
            )
        `)
        .eq('id', requestId)
        .single();

    if (error) return { request: null, error };

    return { request: { ...data, user: data.user, reviewer: data.reviewer } as ExitRequestWithUser, error: null };
}

/**
 * Create an exit request
 */
export async function createExitRequest(
    houseId: string,
    userId: string,
    intendedExitDate: string,
    reason?: string
) {
    const supabase = await createClient();
    
    // Check if user already has a pending request
    const { data: existing } = await supabase
        .from('exit_requests')
        .select('id')
        .eq('house_id', houseId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

    if (existing) {
        return { request: null, error: { message: 'You already have a pending exit request' } };
    }

    const { data, error } = await supabase
        .from('exit_requests')
        .insert({
            house_id: houseId,
            user_id: userId,
            reason,
            intended_exit_date: intendedExitDate,
            status: 'pending',
        })
        .select()
        .single();

    if (!error && data) {
        // Log activity
        await supabase.rpc('log_activity', {
            p_house_id: houseId,
            p_user_id: userId,
            p_activity_type: 'exit_requested',
            p_entity_type: 'exit_request',
            p_entity_id: data.id,
            p_metadata: { intended_exit_date: intendedExitDate },
        });
    }

    return { request: data as ExitRequest | null, error };
}

/**
 * Update an exit request (for user editing their own pending request)
 */
export async function updateExitRequest(
    requestId: string,
    updates: {
        reason?: string;
        intended_exit_date?: string;
    }
) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('exit_requests')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending') // Can only update pending requests
        .select()
        .single();

    return { request: data as ExitRequest | null, error };
}

/**
 * Review an exit request (admin action)
 */
export async function reviewExitRequest(
    requestId: string,
    reviewerId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('exit_requests')
        .update({
            status,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
            review_notes: reviewNotes,
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select(`
            *,
            user:user_id (
                id,
                user_id,
                name
            )
        `)
        .single();

    if (!error && data && status === 'approved') {
        // Log activity
        await supabase.rpc('log_activity', {
            p_house_id: data.house_id,
            p_user_id: reviewerId,
            p_activity_type: 'exit_approved',
            p_entity_type: 'exit_request',
            p_entity_id: requestId,
            p_metadata: { user_name: (data.user as any)?.name },
        });
    }

    return { request: data as ExitRequest | null, error };
}

/**
 * Cancel an exit request (by the requesting user)
 */
export async function cancelExitRequest(requestId: string, userId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('exit_requests')
        .delete()
        .eq('id', requestId)
        .eq('user_id', userId)
        .eq('status', 'pending');

    return { success: !error, error };
}

/**
 * Complete an exit (admin removes member after approval)
 */
export async function completeExit(requestId: string, adminId: string) {
    const supabase = await createClient();
    
    // Get the request
    const { request, error: requestError } = await getExitRequestById(requestId);
    if (requestError || !request) {
        return { success: false, error: requestError || { message: 'Request not found' } };
    }

    if (request.status !== 'approved') {
        return { success: false, error: { message: 'Request must be approved first' } };
    }

    // Update member status to inactive
    const { error: memberError } = await supabase
        .from('house_members')
        .update({ status: 'inactive' })
        .eq('house_id', request.house_id)
        .eq('user_id', request.user_id);

    if (memberError) {
        return { success: false, error: memberError };
    }

    // Update request status to completed
    const { error: updateError } = await supabase
        .from('exit_requests')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', requestId);

    if (updateError) {
        return { success: false, error: updateError };
    }

    // Log activity
    await supabase.rpc('log_activity', {
        p_house_id: request.house_id,
        p_user_id: request.user_id,
        p_activity_type: 'member_left',
        p_entity_type: 'house_member',
        p_entity_id: null,
        p_metadata: { exit_request_id: requestId },
    });

    return { success: true, error: null };
}

/**
 * Get user's exit request for a house
 */
export async function getUserExitRequest(houseId: string, userId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('exit_requests')
        .select('*')
        .eq('house_id', houseId)
        .eq('user_id', userId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    return { request: data as ExitRequest | null, error };
}

/**
 * Get pending exit requests count for a house
 */
export async function getPendingExitRequestsCount(houseId: string) {
    const supabase = await createClient();
    
    const { count, error } = await supabase
        .from('exit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', houseId)
        .eq('status', 'pending');

    return { count: count || 0, error };
}
