// Notice-related services for server-side operations

import { createClient } from '@/utils/supabase/server';
import type { Notice, NoticeWithDetails, NoticeAcknowledgement, NoticePriority } from '@/lib/types';

/**
 * Get all notices for a house
 */
export async function getHouseNotices(houseId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('notices')
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

    if (error) return { notices: [], error };

    // Get member count
    const { count: memberCount } = await supabase
        .from('house_members')
        .select('*', { count: 'exact', head: true })
        .eq('house_id', houseId)
        .eq('status', 'active');

    // Get acknowledgement counts
    const noticeIds = data?.map((n: any) => n.id) || [];
    const { data: acknowledgements } = noticeIds.length > 0
        ? await supabase
            .from('notice_acknowledgements')
            .select('notice_id')
            .in('notice_id', noticeIds)
        : { data: [] };

    const ackCounts = (acknowledgements || []).reduce((acc: Record<string, number>, a: any) => {
        acc[a.notice_id] = (acc[a.notice_id] || 0) + 1;
        return acc;
    }, {});

    const notices = data?.map((n: any) => ({
        ...n,
        creator: n.profiles,
        acknowledgement_count: ackCounts[n.id] || 0,
        total_members: memberCount || 0,
    })) as NoticeWithDetails[];

    return { notices, error: null };
}

/**
 * Get a single notice by ID
 */
export async function getNoticeById(noticeId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('notices')
        .select(`
            *,
            profiles:created_by (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('id', noticeId)
        .single();

    if (error) return { notice: null, error };

    return { notice: { ...data, creator: data.profiles } as NoticeWithDetails, error: null };
}

/**
 * Create a new notice
 */
export async function createNotice(
    houseId: string,
    title: string,
    content: string,
    createdBy: string,
    priority: NoticePriority = 'normal'
) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('notices')
        .insert({
            house_id: houseId,
            title,
            content,
            priority,
            created_by: createdBy,
        })
        .select()
        .single();

    if (!error && data) {
        // Log activity
        await supabase.rpc('log_activity', {
            p_house_id: houseId,
            p_user_id: createdBy,
            p_activity_type: 'notice_created',
            p_entity_type: 'notice',
            p_entity_id: data.id,
            p_metadata: { title, priority },
        });
    }

    return { notice: data as Notice | null, error };
}

/**
 * Delete a notice
 */
export async function deleteNotice(noticeId: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', noticeId);

    return { success: !error, error };
}

/**
 * Get notice acknowledgements
 */
export async function getNoticeAcknowledgements(noticeId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('notice_acknowledgements')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('notice_id', noticeId)
        .order('acknowledged_at', { ascending: false });

    if (error) return { acknowledgements: [], error };

    const acknowledgements = data?.map((a: any) => ({
        ...a,
        user: a.profiles,
    })) || [];

    return { acknowledgements, error: null };
}

/**
 * Check if user has acknowledged a notice
 */
export async function hasUserAcknowledgedNotice(noticeId: string, userId: string) {
    const supabase = await createClient();
    
    const { data } = await supabase
        .from('notice_acknowledgements')
        .select('id')
        .eq('notice_id', noticeId)
        .eq('user_id', userId)
        .single();

    return !!data;
}

/**
 * Acknowledge a notice
 */
export async function acknowledgeNotice(noticeId: string, userId: string) {
    const supabase = await createClient();
    
    // Check if already acknowledged
    const alreadyAcked = await hasUserAcknowledgedNotice(noticeId, userId);
    if (alreadyAcked) {
        return { success: true, error: null };
    }

    const { data, error } = await supabase
        .from('notice_acknowledgements')
        .insert({
            notice_id: noticeId,
            user_id: userId,
        })
        .select()
        .single();

    if (!error && data) {
        // Get notice for activity log
        const { data: notice } = await supabase
            .from('notices')
            .select('house_id, title')
            .eq('id', noticeId)
            .single();

        if (notice) {
            await supabase.rpc('log_activity', {
                p_house_id: notice.house_id,
                p_user_id: userId,
                p_activity_type: 'notice_acknowledged',
                p_entity_type: 'notice',
                p_entity_id: noticeId,
                p_metadata: { title: notice.title },
            });
        }
    }

    return { acknowledgement: data as NoticeAcknowledgement | null, error };
}

/**
 * Get unacknowledged notices for a user
 */
export async function getUnacknowledgedNotices(houseId: string, userId: string) {
    const supabase = await createClient();
    
    // Get all notices
    const { data: notices, error } = await supabase
        .from('notices')
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

    if (error || !notices) return { notices: [], error };

    // Get user's acknowledgements
    const noticeIds = notices.map((n: any) => n.id);
    const { data: acknowledgements } = await supabase
        .from('notice_acknowledgements')
        .select('notice_id')
        .eq('user_id', userId)
        .in('notice_id', noticeIds);

    const acknowledgedIds = new Set((acknowledgements || []).map((a) => a.notice_id));
    const unacknowledged = notices.filter((n: any) => !acknowledgedIds.has(n.id));

    const result = unacknowledged.map((n: any) => ({
        ...n,
        creator: n.profiles,
        is_acknowledged: false,
    })) as NoticeWithDetails[];

    return { notices: result, error: null };
}

/**
 * Get notice summary for dashboard
 */
export async function getNoticeSummary(houseId: string, userId: string) {
    const { notices: unacknowledged } = await getUnacknowledgedNotices(houseId, userId);
    
    const urgent = unacknowledged.filter((n) => n.priority === 'urgent');
    const high = unacknowledged.filter((n) => n.priority === 'high');

    return {
        unacknowledgedCount: unacknowledged.length,
        urgentCount: urgent.length,
        highPriorityCount: high.length,
        unacknowledgedNotices: unacknowledged,
    };
}

/**
 * Get recent notices (last N days)
 */
export async function getRecentNotices(houseId: string, days = 7) {
    const supabase = await createClient();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('notices')
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
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false });

    if (error) return { notices: [], error };

    const notices = data?.map((n: any) => ({
        ...n,
        creator: n.profiles,
    })) as NoticeWithDetails[];

    return { notices, error: null };
}
