// Rent-related services for server-side operations

import { createClient } from '@/utils/supabase/server';
import type { RentCycle, RentEntry, RentCycleWithEntries, RentEntryWithUser } from '@/lib/types';

/**
 * Get all rent cycles for a house
 */
export async function getHouseRentCycles(houseId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('rent_cycles')
        .select('*')
        .eq('house_id', houseId)
        .order('due_date', { ascending: false });

    if (error) return { cycles: [], error };

    // Get entries for each cycle
    const cycleIds = data?.map((c: any) => c.id) || [];
    const { data: entries } = cycleIds.length > 0
        ? await supabase
            .from('rent_entries')
            .select('rent_cycle_id, status, amount')
            .in('rent_cycle_id', cycleIds)
        : { data: [] };

    const entriesByCycle = (entries || []).reduce((acc: Record<string, any[]>, e: any) => {
        if (!acc[e.rent_cycle_id]) acc[e.rent_cycle_id] = [];
        acc[e.rent_cycle_id].push(e);
        return acc;
    }, {});

    const cycles = data?.map((c: any) => {
        const cycleEntries = entriesByCycle[c.id] || [];
        const paidEntries = cycleEntries.filter((e: any) => e.status === 'paid');
        return {
            ...c,
            paid_count: paidEntries.length,
            total_count: cycleEntries.length,
            collected_amount: paidEntries.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0),
        };
    }) as RentCycleWithEntries[];

    return { cycles, error: null };
}

/**
 * Get a single rent cycle by ID
 */
export async function getRentCycleById(cycleId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('rent_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

    return { cycle: data as RentCycle | null, error };
}

/**
 * Get current rent cycle for a house (most recent by due_date that hasn't passed too long ago)
 */
export async function getCurrentRentCycle(houseId: string) {
    const supabase = await createClient();
    
    const today = new Date().toISOString().split('T')[0];
    
    // Get the most recent cycle that's either ongoing or just ended
    const { data, error } = await supabase
        .from('rent_cycles')
        .select('*')
        .eq('house_id', houseId)
        .gte('due_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('due_date', { ascending: false })
        .limit(1)
        .single();

    return { cycle: data as RentCycle | null, error };
}

/**
 * Create a new rent cycle with entries
 */
export async function createRentCycle(
    houseId: string,
    name: string,
    startDate: string,
    dueDate: string,
    totalAmount: number,
    memberAmounts: { user_id: string; amount: number }[],
    createdBy: string,
    notes?: string
) {
    const supabase = await createClient();
    
    // Create the cycle
    const { data: cycle, error: cycleError } = await supabase
        .from('rent_cycles')
        .insert({
            house_id: houseId,
            name,
            start_date: startDate,
            due_date: dueDate,
            total_amount: totalAmount,
            notes,
            created_by: createdBy,
        })
        .select()
        .single();

    if (cycleError) return { cycle: null, error: cycleError };

    // Create entries for each member
    const entries = memberAmounts.map((m) => ({
        rent_cycle_id: cycle.id,
        user_id: m.user_id,
        amount: m.amount,
        status: 'pending' as const,
    }));

    const { error: entriesError } = await supabase
        .from('rent_entries')
        .insert(entries);

    if (entriesError) {
        // Rollback cycle
        await supabase.from('rent_cycles').delete().eq('id', cycle.id);
        return { cycle: null, error: entriesError };
    }

    // Log activity
    await supabase.rpc('log_activity', {
        p_house_id: houseId,
        p_user_id: createdBy,
        p_activity_type: 'rent_cycle_created',
        p_entity_type: 'rent_cycle',
        p_entity_id: cycle.id,
        p_metadata: { name, total_amount: totalAmount },
    });

    return { cycle: cycle as RentCycle, error: null };
}

/**
 * Get rent entries for a cycle
 */
export async function getRentCycleEntries(cycleId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('rent_entries')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            ),
            marker:marked_by (
                id,
                user_id,
                name
            )
        `)
        .eq('rent_cycle_id', cycleId)
        .order('created_at', { ascending: true });

    if (error) return { entries: [], error };

    const entries = data?.map((e: any) => ({
        ...e,
        user: e.profiles,
        marker: e.marker,
    })) as RentEntryWithUser[];

    return { entries, error: null };
}

/**
 * Get user's rent entry for a cycle
 */
export async function getUserRentEntry(cycleId: string, userId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('rent_entries')
        .select('*')
        .eq('rent_cycle_id', cycleId)
        .eq('user_id', userId)
        .single();

    return { entry: data as RentEntry | null, error };
}

/**
 * Update rent entry status
 */
export async function updateRentEntryStatus(
    entryId: string,
    status: 'pending' | 'paid' | 'overdue' | 'waived',
    markedBy: string,
    notes?: string
) {
    const supabase = await createClient();
    
    const updateData: any = {
        status,
        marked_by: markedBy,
        updated_at: new Date().toISOString(),
    };

    if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
    }

    if (notes !== undefined) {
        updateData.notes = notes;
    }

    const { data, error } = await supabase
        .from('rent_entries')
        .update(updateData)
        .eq('id', entryId)
        .select(`
            *,
            rent_cycles (
                id,
                house_id,
                name
            )
        `)
        .single();

    if (!error && data && status === 'paid') {
        const cycle = data.rent_cycles as any;
        await supabase.rpc('log_activity', {
            p_house_id: cycle.house_id,
            p_user_id: data.user_id,
            p_activity_type: 'rent_marked_paid',
            p_entity_type: 'rent_entry',
            p_entity_id: entryId,
            p_metadata: { cycle_name: cycle.name, amount: data.amount },
        });
    }

    return { entry: data as RentEntry | null, error };
}

/**
 * Get overdue rent entries for a house
 */
export async function getOverdueRentEntries(houseId: string) {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('rent_entries')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            ),
            rent_cycles!inner (
                id,
                house_id,
                name,
                due_date
            )
        `)
        .eq('rent_cycles.house_id', houseId)
        .eq('status', 'pending')
        .lt('rent_cycles.due_date', today);

    if (error) return { entries: [], error };

    return { entries: data as any[], error: null };
}

/**
 * Get rent summary for dashboard
 */
export async function getRentSummary(houseId: string, userId: string) {
    const supabase = await createClient();
    
    // Get current cycle
    const { cycle: currentCycle } = await getCurrentRentCycle(houseId);
    
    if (!currentCycle) {
        return {
            currentCycle: null,
            userEntry: null,
            paidCount: 0,
            totalCount: 0,
        };
    }

    // Get entries for the cycle
    const { entries } = await getRentCycleEntries(currentCycle.id);
    const userEntry = entries.find((e) => e.user_id === userId) || null;
    const paidCount = entries.filter((e) => e.status === 'paid').length;

    return {
        currentCycle: {
            ...currentCycle,
            entries,
            paid_count: paidCount,
            total_count: entries.length,
            collected_amount: entries
                .filter((e) => e.status === 'paid')
                .reduce((sum, e) => sum + e.amount, 0),
        },
        userEntry,
        paidCount,
        totalCount: entries.length,
    };
}
