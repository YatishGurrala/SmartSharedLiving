// Chore-related services for server-side operations

import { createClient } from '@/utils/supabase/server';
import type { Chore, ChoreWithAssignee, ChoreRecurrence, ChoreStatus } from '@/lib/types';

/**
 * Get all chores for a house
 */
export async function getHouseChores(houseId: string, options?: { status?: ChoreStatus; assignedTo?: string }) {
    const supabase = await createClient();
    
    let query = supabase
        .from('chores')
        .select(`
            *,
            assignee:assigned_to (
                id,
                user_id,
                name,
                avatar
            ),
            creator:created_by (
                id,
                user_id,
                name
            )
        `)
        .eq('house_id', houseId);

    if (options?.status) {
        query = query.eq('status', options.status);
    }
    if (options?.assignedTo) {
        query = query.eq('assigned_to', options.assignedTo);
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false });

    if (error) return { chores: [], error };

    const chores = data?.map((c: any) => ({
        ...c,
        assignee: c.assignee,
        creator: c.creator,
    })) as ChoreWithAssignee[];

    return { chores, error: null };
}

/**
 * Get a single chore by ID
 */
export async function getChoreById(choreId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('chores')
        .select(`
            *,
            assignee:assigned_to (
                id,
                user_id,
                name,
                avatar
            ),
            creator:created_by (
                id,
                user_id,
                name
            )
        `)
        .eq('id', choreId)
        .single();

    if (error) return { chore: null, error };

    return { chore: { ...data, assignee: data.assignee, creator: data.creator } as ChoreWithAssignee, error: null };
}

/**
 * Create a new chore
 */
export async function createChore(
    houseId: string,
    title: string,
    createdBy: string,
    options?: {
        description?: string;
        assignedTo?: string;
        dueDate?: string;
        recurrence?: ChoreRecurrence;
    }
) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('chores')
        .insert({
            house_id: houseId,
            title,
            description: options?.description || null,
            assigned_to: options?.assignedTo || null,
            due_date: options?.dueDate || null,
            recurrence: options?.recurrence || 'once',
            status: 'pending',
            created_by: createdBy,
        })
        .select()
        .single();

    if (!error && data) {
        // Log activity
        await supabase.rpc('log_activity', {
            p_house_id: houseId,
            p_user_id: createdBy,
            p_activity_type: 'chore_created',
            p_entity_type: 'chore',
            p_entity_id: data.id,
            p_metadata: { title },
        });
    }

    return { chore: data as Chore | null, error };
}

/**
 * Update a chore
 */
export async function updateChore(
    choreId: string,
    updates: {
        title?: string;
        description?: string | null;
        assigned_to?: string | null;
        due_date?: string | null;
        recurrence?: ChoreRecurrence;
        status?: ChoreStatus;
    }
) {
    const supabase = await createClient();
    
    const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString(),
    };

    if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
        .from('chores')
        .update(updateData)
        .eq('id', choreId)
        .select()
        .single();

    return { chore: data as Chore | null, error };
}

/**
 * Mark chore as complete
 */
export async function completeChore(choreId: string, userId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('chores')
        .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', choreId)
        .select()
        .single();

    if (!error && data) {
        // Log activity
        await supabase.rpc('log_activity', {
            p_house_id: data.house_id,
            p_user_id: userId,
            p_activity_type: 'chore_completed',
            p_entity_type: 'chore',
            p_entity_id: choreId,
            p_metadata: { title: data.title },
        });
    }

    return { chore: data as Chore | null, error };
}

/**
 * Delete a chore
 */
export async function deleteChore(choreId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('chores')
        .delete()
        .eq('id', choreId);

    return { success: !error, error };
}

/**
 * Get user's assigned chores
 */
export async function getUserChores(houseId: string, userId: string, status?: ChoreStatus) {
    const supabase = await createClient();
    
    let query = supabase
        .from('chores')
        .select('*')
        .eq('house_id', houseId)
        .eq('assigned_to', userId);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsFirst: false });

    return { chores: data as Chore[] || [], error };
}

/**
 * Get pending chores for a house
 */
export async function getPendingChores(houseId: string) {
    return getHouseChores(houseId, { status: 'pending' });
}

/**
 * Get overdue chores (pending and past due date)
 */
export async function getOverdueChores(houseId: string) {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('chores')
        .select(`
            *,
            assignee:assigned_to (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .eq('status', 'pending')
        .not('due_date', 'is', null)
        .lt('due_date', today)
        .order('due_date', { ascending: true });

    if (error) return { chores: [], error };

    const chores = data?.map((c: any) => ({
        ...c,
        assignee: c.assignee,
    })) as ChoreWithAssignee[];

    return { chores, error: null };
}

/**
 * Get chore summary for dashboard
 */
export async function getChoreSummary(houseId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    // Get pending chores assigned to user
    const { chores: pendingChores } = await getUserChores(houseId, userId, 'pending');
    
    // Get overdue chores
    const { chores: overdueChores } = await getOverdueChores(houseId);
    const userOverdueChores = overdueChores.filter((c) => c.assigned_to === userId);

    return {
        pendingCount: pendingChores.length,
        overdueCount: userOverdueChores.length,
        pendingChores,
        overdueChores: userOverdueChores,
    };
}

/**
 * Get upcoming chores (due in next N days)
 */
export async function getUpcomingChores(houseId: string, days = 7) {
    const supabase = await createClient();
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
        .from('chores')
        .select(`
            *,
            assignee:assigned_to (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .eq('status', 'pending')
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

    if (error) return { chores: [], error };

    const chores = data?.map((c: any) => ({
        ...c,
        assignee: c.assignee,
    })) as ChoreWithAssignee[];

    return { chores, error: null };
}
