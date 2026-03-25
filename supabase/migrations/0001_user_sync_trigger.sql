-- Migration: User Sync Trigger
-- This trigger automatically creates a public.users record when a user signs up via Supabase Auth

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user deletion (cleanup)
CREATE OR REPLACE FUNCTION public.handle_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users delete
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_deleted();

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifestyle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.house_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for lifestyle_profiles
CREATE POLICY "Lifestyle profiles are viewable by everyone" ON public.lifestyle_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own lifestyle profile" ON public.lifestyle_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lifestyle profile" ON public.lifestyle_profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for housing_preferences
CREATE POLICY "Housing preferences are viewable by everyone" ON public.housing_preferences FOR SELECT USING (true);
CREATE POLICY "Users can insert own housing preferences" ON public.housing_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own housing preferences" ON public.housing_preferences FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for listings
CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT USING (true);
CREATE POLICY "Users can create listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their listings" ON public.listings FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their listings" ON public.listings FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for rooms
CREATE POLICY "Rooms are viewable by everyone" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Listing owners can manage rooms" ON public.rooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND owner_id = auth.uid())
);

-- RLS Policies for houses
CREATE POLICY "Houses are viewable by everyone" ON public.houses FOR SELECT USING (true);
CREATE POLICY "Users can create houses" ON public.houses FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "House creators can update" ON public.houses FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for house_members
CREATE POLICY "House members viewable by members" ON public.house_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.house_members hm WHERE hm.house_id = house_id AND hm.user_id = auth.uid())
);
CREATE POLICY "Admins can manage members" ON public.house_members FOR ALL USING (
    EXISTS (SELECT 1 FROM public.house_members hm WHERE hm.house_id = house_id AND hm.user_id = auth.uid() AND hm.role = 'admin')
);

-- RLS Policies for applications
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = applicant_user_id);
CREATE POLICY "Users can create applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = applicant_user_id);
CREATE POLICY "Applicants can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = applicant_user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (
    conversation_id LIKE '%' || auth.uid()::text || '%' OR sender_id = auth.uid()
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
