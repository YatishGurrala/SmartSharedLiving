// Activity Log services for server-side operations

import { createClient } from '@/utils/supabase/server';
import type { ActivityLog, ActivityLogWithUser, ActivityType } from '@/lib/types';

/**
 * Get activity logs for a house
 */
export async function getHouseActivityLogs(houseId: string, options?: { limit?: number; offset?: number }) {
    const supabase = await createClient();
    
    let query = supabase
        .from('activity_logs')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .order('created_at', { ascending: false });

    if (options?.limit) {
        query = query.limit(options.limit);
    }
    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) return { logs: [], error };

    const logs = data?.map((l: any) => ({
        ...l,
        user: l.profiles,
    })) as ActivityLogWithUser[];

    return { logs, error: null };
}

/**
 * Get recent activity logs for a house (last N days)
 */
export async function getRecentActivityLogs(houseId: string, days = 7, limit = 20) {
    const supabase = await createClient();
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return { logs: [], error };

    const logs = data?.map((l: any) => ({
        ...l,
        user: l.profiles,
    })) as ActivityLogWithUser[];

    return { logs, error: null };
}

/**
 * Get activity logs for a specific entity
 */
export async function getEntityActivityLogs(entityType: string, entityId: string) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

    if (error) return { logs: [], error };

    const logs = data?.map((l: any) => ({
        ...l,
        user: l.profiles,
    })) as ActivityLogWithUser[];

    return { logs, error: null };
}

/**
 * Get activity logs by type
 */
export async function getActivityLogsByType(houseId: string, activityType: ActivityType, limit = 10) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
            *,
            profiles:user_id (
                id,
                user_id,
                name,
                avatar
            )
        `)
        .eq('house_id', houseId)
        .eq('activity_type', activityType)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return { logs: [], error };

    const logs = data?.map((l: any) => ({
        ...l,
        user: l.profiles,
    })) as ActivityLogWithUser[];

    return { logs, error: null };
}

/**
 * Get user's activity in a house
 */
export async function getUserActivityLogs(houseId: string, userId: string, limit = 20) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('house_id', houseId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    return { logs: data as ActivityLog[] || [], error };
}

/**
 * Log an activity (manual logging from services)
 */
export async function logActivity(
    houseId: string,
    userId: string | null,
    activityType: ActivityType,
    options?: {
        entityType?: string;
        entityId?: string;
        metadata?: Record<string, unknown>;
    }
) {
    const supabase = await createClient();
    
    const { data, error } = await supabase
        .from('activity_logs')
        .insert({
            house_id: houseId,
            user_id: userId,
            activity_type: activityType,
            entity_type: options?.entityType || null,
            entity_id: options?.entityId || null,
            metadata: options?.metadata || null,
        })
        .select()
        .single();

    return { log: data as ActivityLog | null, error };
}

/**
 * Get activity description for display
 */
export function getActivityDescription(log: ActivityLogWithUser): string {
    const userName = log.user?.name || 'Someone';
    const metadata = log.metadata || {};
    
    const descriptions: Record<ActivityType, string> = {
        house_created: `${userName} created this house`,
        member_joined: `${userName} joined the house`,
        member_left: `${userName} left the house`,
        agreement_created: `${userName} created agreement "${metadata.title || 'Untitled'}"`,
        agreement_accepted: `${userName} accepted the agreement`,
        rent_cycle_created: `${userName} created rent cycle "${metadata.name || ''}"`,
        rent_marked_paid: `${userName} marked rent as paid`,
        chore_created: `${userName} created chore "${metadata.title || ''}"`,
        chore_completed: `${userName} completed chore "${metadata.title || ''}"`,
        chore_missed: `Chore "${metadata.title || ''}" was marked as missed`,
        notice_created: `${userName} posted a notice: "${metadata.title || ''}"`,
        notice_acknowledged: `${userName} acknowledged a notice`,
        exit_requested: `${userName} submitted an exit request`,
        exit_approved: `Exit request was approved`,
    };

    return descriptions[log.activity_type] || `${userName} performed an action`;
}

/**
 * Get activity icon for display
 */
export function getActivityIcon(activityType: ActivityType): string {
    const icons: Record<ActivityType, string> = {
        house_created: '🏠',
        member_joined: '👋',
        member_left: '👋',
        agreement_created: '📝',
        agreement_accepted: '✅',
        rent_cycle_created: '💰',
        rent_marked_paid: '✅',
        chore_created: '🧹',
        chore_completed: '✅',
        chore_missed: '⚠️',
        notice_created: '📢',
        notice_acknowledged: '👁️',
        exit_requested: '🚪',
        exit_approved: '✅',
    };

    return icons[activityType] || '📌';
}
