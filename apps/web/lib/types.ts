// Database Types for Roompact MVP
// Generated from Supabase schema

// ============================================
// ENUMS
// ============================================

export type AgreementStatus = 'draft' | 'active' | 'superseded' | 'archived';
export type RentStatus = 'pending' | 'paid' | 'overdue' | 'waived';
export type ChoreStatus = 'pending' | 'completed' | 'missed';
export type ChoreRecurrence = 'once' | 'daily' | 'weekly' | 'monthly';
export type ExitRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type ActivityType =
    | 'house_created'
    | 'member_joined'
    | 'member_left'
    | 'agreement_created'
    | 'agreement_accepted'
    | 'rent_cycle_created'
    | 'rent_marked_paid'
    | 'chore_created'
    | 'chore_completed'
    | 'chore_missed'
    | 'notice_created'
    | 'notice_acknowledged'
    | 'exit_requested'
    | 'exit_approved';

export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'active' | 'inactive';
export type HouseStatus = 'forming' | 'active';
export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================
// BASE TYPES
// ============================================

export interface User {
    id: string;
    email: string;
    created_at: string;
}

export interface Profile {
    id: string;
    user_id: string;
    name: string | null;
    bio: string | null;
    occupation: string | null;
    avatar: string | null;
    created_at: string;
}

export interface House {
    id: string;
    created_by: string;
    city: string;
    target_members: number;
    status: HouseStatus;
    created_at: string;
}

export interface HouseMember {
    house_id: string;
    user_id: string;
    role: MemberRole;
    status: MemberStatus;
    created_at: string;
}

// ============================================
// INVITE TYPES
// ============================================

export interface HouseInvite {
    id: string;
    house_id: string;
    invite_code: string;
    created_by: string;
    email: string | null;
    max_uses: number;
    uses: number;
    expires_at: string | null;
    created_at: string;
}

export interface HouseInviteWithHouse extends HouseInvite {
    houses: House;
}

// ============================================
// AGREEMENT TYPES
// ============================================

export interface Agreement {
    id: string;
    house_id: string;
    title: string;
    content: string;
    version: number;
    status: AgreementStatus;
    created_by: string | null;
    previous_version_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface AgreementWithCreator extends Agreement {
    creator?: Profile;
    acceptance_count?: number;
    total_members?: number;
}

export interface AgreementAcceptance {
    id: string;
    agreement_id: string;
    user_id: string;
    accepted_at: string;
    ip_address: string | null;
}

export interface AgreementAcceptanceWithUser extends AgreementAcceptance {
    user?: Profile;
}

// ============================================
// RENT TYPES
// ============================================

export interface RentCycle {
    id: string;
    house_id: string;
    name: string;
    start_date: string;
    due_date: string;
    total_amount: number;
    notes: string | null;
    created_by: string | null;
    created_at: string;
}

export interface RentCycleWithEntries extends RentCycle {
    entries?: RentEntry[];
    paid_count?: number;
    total_count?: number;
    collected_amount?: number;
}

export interface RentEntry {
    id: string;
    rent_cycle_id: string;
    user_id: string;
    amount: number;
    status: RentStatus;
    paid_at: string | null;
    marked_by: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface RentEntryWithUser extends RentEntry {
    user?: Profile;
    marker?: Profile;
}

// ============================================
// CHORE TYPES
// ============================================

export interface Chore {
    id: string;
    house_id: string;
    title: string;
    description: string | null;
    assigned_to: string | null;
    due_date: string | null;
    recurrence: ChoreRecurrence;
    status: ChoreStatus;
    completed_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChoreWithAssignee extends Chore {
    assignee?: Profile;
    creator?: Profile;
}

// ============================================
// NOTICE TYPES
// ============================================

export interface Notice {
    id: string;
    house_id: string;
    title: string;
    content: string;
    priority: NoticePriority;
    created_by: string | null;
    created_at: string;
}

export interface NoticeWithDetails extends Notice {
    creator?: Profile;
    acknowledgement_count?: number;
    total_members?: number;
    is_acknowledged?: boolean;
}

export interface NoticeAcknowledgement {
    id: string;
    notice_id: string;
    user_id: string;
    acknowledged_at: string;
}

export interface NoticeAcknowledgementWithUser extends NoticeAcknowledgement {
    user?: Profile;
}

// ============================================
// EXIT REQUEST TYPES
// ============================================

export interface ExitRequest {
    id: string;
    house_id: string;
    user_id: string;
    reason: string | null;
    intended_exit_date: string;
    status: ExitRequestStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface ExitRequestWithUser extends ExitRequest {
    user?: Profile;
    reviewer?: Profile;
}

// ============================================
// ACTIVITY LOG TYPES
// ============================================

export interface ActivityLog {
    id: string;
    house_id: string;
    user_id: string | null;
    activity_type: ActivityType;
    entity_type: string | null;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface ActivityLogWithUser extends ActivityLog {
    user?: Profile;
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardData {
    rentSummary: {
        currentCycle: RentCycleWithEntries | null;
        userEntry: RentEntryWithUser | null;
        paidCount: number;
        totalCount: number;
    };
    pendingChores: ChoreWithAssignee[];
    overdueChores: ChoreWithAssignee[];
    pendingAgreements: AgreementWithCreator[];
    unacknowledgedNotices: NoticeWithDetails[];
    recentActivity: ActivityLogWithUser[];
}

// ============================================
// FORM/INPUT TYPES
// ============================================

export interface CreateHouseInput {
    city: string;
    target_members: number;
}

export interface CreateAgreementInput {
    house_id: string;
    title: string;
    content: string;
}

export interface CreateRentCycleInput {
    house_id: string;
    name: string;
    start_date: string;
    due_date: string;
    total_amount: number;
    notes?: string;
    member_amounts: {
        user_id: string;
        amount: number;
    }[];
}

export interface CreateChoreInput {
    house_id: string;
    title: string;
    description?: string;
    assigned_to?: string;
    due_date?: string;
    recurrence: ChoreRecurrence;
}

export interface CreateNoticeInput {
    house_id: string;
    title: string;
    content: string;
    priority: NoticePriority;
}

export interface CreateExitRequestInput {
    house_id: string;
    reason?: string;
    intended_exit_date: string;
}

export interface CreateInviteInput {
    house_id: string;
    email?: string;
    max_uses?: number;
    expires_days?: number;
}
