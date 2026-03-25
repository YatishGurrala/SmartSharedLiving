-- Migration: Roompact MVP Schema
-- Adds agreements, rent tracking, chores, notices, exit requests, and activity logging

-- ============================================
-- ENUMS
-- ============================================

-- Agreement status enum
CREATE TYPE agreement_status AS ENUM ('draft', 'active', 'superseded', 'archived');

-- Rent status enum
CREATE TYPE rent_status AS ENUM ('pending', 'paid', 'overdue', 'waived');

-- Chore status enum
CREATE TYPE chore_status AS ENUM ('pending', 'completed', 'missed');

-- Chore recurrence enum
CREATE TYPE chore_recurrence AS ENUM ('once', 'daily', 'weekly', 'monthly');

-- Exit request status enum
CREATE TYPE exit_request_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

-- Activity type enum
CREATE TYPE activity_type AS ENUM (
    'house_created',
    'member_joined',
    'member_left',
    'agreement_created',
    'agreement_accepted',
    'rent_cycle_created',
    'rent_marked_paid',
    'chore_created',
    'chore_completed',
    'chore_missed',
    'notice_created',
    'notice_acknowledged',
    'exit_requested',
    'exit_approved'
);

-- ============================================
-- HOUSE INVITES TABLE (for invite link flow)
-- ============================================

CREATE TABLE public.house_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    email VARCHAR(255), -- Optional: specific email invitation
    max_uses INTEGER DEFAULT 1,
    uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for quick invite code lookup
CREATE INDEX idx_house_invites_code ON public.house_invites(invite_code);
CREATE INDEX idx_house_invites_house ON public.house_invites(house_id);

-- ============================================
-- AGREEMENTS TABLE
-- ============================================

CREATE TABLE public.agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    status agreement_status DEFAULT 'draft' NOT NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    previous_version_id UUID REFERENCES public.agreements(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for house agreements
CREATE INDEX idx_agreements_house ON public.agreements(house_id);
CREATE INDEX idx_agreements_status ON public.agreements(house_id, status);

-- ============================================
-- AGREEMENT ACCEPTANCES TABLE
-- ============================================

CREATE TABLE public.agreement_acceptances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID REFERENCES public.agreements(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address VARCHAR(45), -- For audit purposes
    UNIQUE(agreement_id, user_id)
);

-- Index for quick acceptance lookup
CREATE INDEX idx_agreement_acceptances_agreement ON public.agreement_acceptances(agreement_id);
CREATE INDEX idx_agreement_acceptances_user ON public.agreement_acceptances(user_id);

-- ============================================
-- RENT CYCLES TABLE
-- ============================================

CREATE TABLE public.rent_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL, -- e.g., "March 2026 Rent"
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for house rent cycles
CREATE INDEX idx_rent_cycles_house ON public.rent_cycles(house_id);
CREATE INDEX idx_rent_cycles_due_date ON public.rent_cycles(house_id, due_date);

-- ============================================
-- RENT ENTRIES TABLE
-- ============================================

CREATE TABLE public.rent_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rent_cycle_id UUID REFERENCES public.rent_cycles(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status rent_status DEFAULT 'pending' NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(rent_cycle_id, user_id)
);

-- Index for rent entries
CREATE INDEX idx_rent_entries_cycle ON public.rent_entries(rent_cycle_id);
CREATE INDEX idx_rent_entries_user ON public.rent_entries(user_id);
CREATE INDEX idx_rent_entries_status ON public.rent_entries(status);

-- ============================================
-- CHORES TABLE
-- ============================================

CREATE TABLE public.chores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    due_date DATE,
    recurrence chore_recurrence DEFAULT 'once' NOT NULL,
    status chore_status DEFAULT 'pending' NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for chores
CREATE INDEX idx_chores_house ON public.chores(house_id);
CREATE INDEX idx_chores_assigned ON public.chores(assigned_to);
CREATE INDEX idx_chores_status ON public.chores(house_id, status);
CREATE INDEX idx_chores_due_date ON public.chores(house_id, due_date);

-- ============================================
-- NOTICES TABLE
-- ============================================

CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for notices
CREATE INDEX idx_notices_house ON public.notices(house_id);
CREATE INDEX idx_notices_created_at ON public.notices(house_id, created_at DESC);

-- ============================================
-- NOTICE ACKNOWLEDGEMENTS TABLE
-- ============================================

CREATE TABLE public.notice_acknowledgements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notice_id UUID REFERENCES public.notices(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(notice_id, user_id)
);

-- Index for acknowledgements
CREATE INDEX idx_notice_acknowledgements_notice ON public.notice_acknowledgements(notice_id);
CREATE INDEX idx_notice_acknowledgements_user ON public.notice_acknowledgements(user_id);

-- ============================================
-- EXIT REQUESTS TABLE
-- ============================================

CREATE TABLE public.exit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reason TEXT,
    intended_exit_date DATE NOT NULL,
    status exit_request_status DEFAULT 'pending' NOT NULL,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for exit requests
CREATE INDEX idx_exit_requests_house ON public.exit_requests(house_id);
CREATE INDEX idx_exit_requests_user ON public.exit_requests(user_id);
CREATE INDEX idx_exit_requests_status ON public.exit_requests(house_id, status);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    activity_type activity_type NOT NULL,
    entity_type VARCHAR(50), -- 'agreement', 'rent_cycle', 'chore', 'notice', etc.
    entity_id UUID, -- Reference to the entity
    metadata JSONB, -- Additional context-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for activity logs
CREATE INDEX idx_activity_logs_house ON public.activity_logs(house_id);
CREATE INDEX idx_activity_logs_house_created ON public.activity_logs(house_id, created_at DESC);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE public.house_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- House Invites Policies
CREATE POLICY "House members can view invites" ON public.house_invites 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = house_invites.house_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can create invites" ON public.house_invites 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = house_invites.house_id AND user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can delete invites" ON public.house_invites 
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = house_invites.house_id AND user_id = auth.uid() AND role = 'admin')
    );

-- Public invite lookup for join flow
CREATE POLICY "Anyone can lookup invite by code" ON public.house_invites 
    FOR SELECT USING (true);

-- Agreements Policies
CREATE POLICY "House members can view agreements" ON public.agreements 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = agreements.house_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can create agreements" ON public.agreements 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = agreements.house_id AND user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update agreements" ON public.agreements 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = agreements.house_id AND user_id = auth.uid() AND role = 'admin')
    );

-- Agreement Acceptances Policies
CREATE POLICY "Members can view acceptances in their houses" ON public.agreement_acceptances 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.agreements a 
            JOIN public.house_members hm ON hm.house_id = a.house_id 
            WHERE a.id = agreement_acceptances.agreement_id AND hm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can accept agreements" ON public.agreement_acceptances 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rent Cycles Policies
CREATE POLICY "House members can view rent cycles" ON public.rent_cycles 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = rent_cycles.house_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage rent cycles" ON public.rent_cycles 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = rent_cycles.house_id AND user_id = auth.uid() AND role = 'admin')
    );

-- Rent Entries Policies
CREATE POLICY "House members can view rent entries" ON public.rent_entries 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rent_cycles rc 
            JOIN public.house_members hm ON hm.house_id = rc.house_id 
            WHERE rc.id = rent_entries.rent_cycle_id AND hm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage rent entries" ON public.rent_entries 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.rent_cycles rc 
            JOIN public.house_members hm ON hm.house_id = rc.house_id 
            WHERE rc.id = rent_entries.rent_cycle_id AND hm.user_id = auth.uid() AND hm.role = 'admin'
        )
    );

-- Chores Policies
CREATE POLICY "House members can view chores" ON public.chores 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = chores.house_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage chores" ON public.chores 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = chores.house_id AND user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Assigned users can update their chores" ON public.chores 
    FOR UPDATE USING (assigned_to = auth.uid());

-- Notices Policies
CREATE POLICY "House members can view notices" ON public.notices 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = notices.house_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can create notices" ON public.notices 
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = notices.house_id AND user_id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage notices" ON public.notices 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = notices.house_id AND user_id = auth.uid() AND role = 'admin')
    );

-- Notice Acknowledgements Policies
CREATE POLICY "Members can view acknowledgements" ON public.notice_acknowledgements 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.notices n 
            JOIN public.house_members hm ON hm.house_id = n.house_id 
            WHERE n.id = notice_acknowledgements.notice_id AND hm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can acknowledge notices" ON public.notice_acknowledgements 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Exit Requests Policies
CREATE POLICY "Members can view exit requests" ON public.exit_requests 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = exit_requests.house_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can create exit requests" ON public.exit_requests 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending requests" ON public.exit_requests 
    FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can update exit requests" ON public.exit_requests 
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = exit_requests.house_id AND user_id = auth.uid() AND role = 'admin')
    );

-- Activity Logs Policies
CREATE POLICY "House members can view activity logs" ON public.activity_logs 
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.house_members WHERE house_id = activity_logs.house_id AND user_id = auth.uid())
    );

CREATE POLICY "System can insert activity logs" ON public.activity_logs 
    FOR INSERT WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    chars VARCHAR(62) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result VARCHAR(20) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * 62 + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_house_id UUID,
    p_user_id UUID,
    p_activity_type activity_type,
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.activity_logs (house_id, user_id, activity_type, entity_type, entity_id, metadata)
    VALUES (p_house_id, p_user_id, p_activity_type, p_entity_type, p_entity_id, p_metadata)
    RETURNING id INTO log_id;
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update rent entries to overdue status
CREATE OR REPLACE FUNCTION update_overdue_rent_entries()
RETURNS void AS $$
BEGIN
    UPDATE public.rent_entries re
    SET status = 'overdue', updated_at = NOW()
    FROM public.rent_cycles rc
    WHERE re.rent_cycle_id = rc.id
    AND re.status = 'pending'
    AND rc.due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update chores to missed status
CREATE OR REPLACE FUNCTION update_missed_chores()
RETURNS void AS $$
BEGIN
    UPDATE public.chores
    SET status = 'missed', updated_at = NOW()
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
