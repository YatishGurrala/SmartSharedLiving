// Agreement-related services for server-side operations

import { createClient } from '@/utils/supabase/server';
import type { Agreement, AgreementAcceptance, AgreementWithCreator } from '@/lib/types';

/**
 * Get all agreements for a house
 */
export async function getHouseAgreements(houseId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('agreements')
        .select(`
            *,
            profiles:created_by (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .order('created_at', { ascending: false });

    if (error) return { agreements: [], error };

    // Get member count for the house
    const { count: memberCount } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', houseId)
        .eq('status', 'active');

    // Get acceptance counts for each agreement
    const agreementIds = data?.map((a: any) => a.id) || [];
    const { data: acceptances } = agreementIds.length > 0
        ? await supabase
            .from('agreement_acceptances')
            .select('agreement_id')
            .in('agreement_id', agreementIds)
        : { data: [] };

    const acceptanceCounts = (acceptances || []).reduce((acc: Record<string, number>, a: any) => {
        acc[a.agreement_id] = (acc[a.agreement_id] || 0) + 1;
        return acc;
    }, {});

    const agreements = data?.map((a: any) => ({
        ...a,
        creator: a.profiles,
        acceptance_count: acceptanceCounts[a.id] || 0,
        total_members: memberCount || 0,
    })) as AgreementWithCreator[];

    return { agreements, error: null };
}

/**
 * Get a single agreement by ID
 */
export async function getAgreementById(agreementId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('agreements')
        .select(`
            *,
            profiles:created_by (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('id', agreementId)
        .single();

    if (error) return { agreement: null, error };

    return { agreement: { ...data, creator: data.profiles } as AgreementWithCreator, error: null };
}

/**
 * Get active agreement for a house
 */
export async function getActiveAgreement(houseId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('agreements')
        .select(`
            *,
            profiles:created_by (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .eq('status', 'active')
        .single();

    if (error) return { agreement: null, error };

    return { agreement: { ...data, creator: data.profiles } as AgreementWithCreator, error: null };
}

/**
 * Create a new agreement
 */
export async function createAgreement(
    houseId: string,
    title: string,
    content: string,
    createdBy: string
) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('agreements')
        .insert({
            house_id: houseId,
            title,
            content,
            created_by: createdBy,
            status: 'draft',
            version: 1,
        })
        .select()
        .single();

    if (!error && data) {
        // Log activity
        await supabase.rpc('log_activity', {
            p_house_id: houseId,
            p_user_id: createdBy,
            p_activity_type: 'agreement_created',
            p_entity_type: 'agreement',
            p_entity_id: data.id,
            p_metadata: { title },
        });
    }

    return { agreement: data as Agreement | null, error };
}

/**
 * Update an agreement (creates new version if active)
 */
export async function updateAgreement(
    agreementId: string,
    updates: { title?: string; content?: string; status?: string },
    userId: string
) {
    const supabase = await createClient();
    
    // Get the current agreement
    const { data: current } = await supabase
        .from('agreements')
        .select('*')
        .eq('id', agreementId)
        .single();

    if (!current) {
        return { agreement: null, error: { message: 'Agreement not found' } };
    }

    // If activating, create a new version
    if (updates.status === 'active' && current.status === 'draft') {
        // Check if there's already an active agreement
        const { data: existingActive } = await supabase
            .from('agreements')
            .select('id')
            .eq('house_id', current.house_id)
            .eq('status', 'active')
            .single();

        // Mark existing active as superseded
        if (existingActive) {
            await supabase
                .from('agreements')
                .update({ status: 'superseded', updated_at: new Date().toISOString() })
                .eq('id', existingActive.id);
        }
    }

    const { data, error } = await supabase
        .from('agreements')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', agreementId)
        .select()
        .single();

    return { agreement: data as Agreement | null, error };
}

/**
 * Get agreement acceptances
 */
export async function getAgreementAcceptances(agreementId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('agreement_acceptances')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('agreement_id', agreementId)
        .order('accepted_at', { ascending: false });

    if (error) return { acceptances: [], error };

    const acceptances = data?.map((a: any) => ({
        ...a,
        user: a.profiles,
    })) || [];

    return { acceptances, error: null };
}

/**
 * Check if user has accepted an agreement
 */
export async function hasUserAcceptedAgreement(agreementId: string, userId: string) {
    const supabase = await createClient();
    
    const { data } = await supabase
        .from('agreement_acceptances')
        .select('id')
        .eq('agreement_id', agreementId)
        .eq('user_id', userId)
        .single();

    return !!data;
}

/**
 * Accept an agreement
 */
export async function acceptAgreement(agreementId: string, userId: string, ipAddress?: string) {
    const supabase = await createClient();
    
    // Check if already accepted
    const alreadyAccepted = await hasUserAcceptedAgreement(agreementId, userId);
    if (alreadyAccepted) {
        return { success: true, error: null };
    }

    const { data, error } = await supabase
        .from('agreement_acceptances')
        .insert({
            agreement_id: agreementId,
            user_id: userId,
            ip_address: ipAddress,
        })
        .select()
        .single();

    if (!error && data) {
        // Get agreement for activity log
        const { data: agreement } = await supabase
            .from('agreements')
            .select('house_id, title')
            .eq('id', agreementId)
            .single();

        if (agreement) {
            await supabase.rpc('log_activity', {
                p_house_id: agreement.house_id,
                p_user_id: userId,
                p_activity_type: 'agreement_accepted',
                p_entity_type: 'agreement',
                p_entity_id: agreementId,
                p_metadata: { title: agreement.title },
            });
        }
    }

    return { acceptance: data as AgreementAcceptance | null, error };
}

/**
 * Get pending agreements (active but not accepted by user)
 */
export async function getPendingAgreements(houseId: string, userId: string) {
    const supabase = await createClient();
    
    // Get all active agreements
    const { data: agreements, error } = await supabase
        .from('agreements')
        .select('*')
        .eq('house_id', houseId)
        .eq('status', 'active');

    if (error || !agreements) return { agreements: [], error };

    // Get user's acceptances
    const agreementIds = agreements.map((a) => a.id);
    const { data: acceptances } = await supabase
        .from('agreement_acceptances')
        .select('agreement_id')
        .eq('user_id', userId)
        .in('agreement_id', agreementIds);

    const acceptedIds = new Set((acceptances || []).map((a) => a.agreement_id));
    const pending = agreements.filter((a) => !acceptedIds.has(a.id));

    return { agreements: pending as Agreement[], error: null };
}
