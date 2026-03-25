// Validation Schemas using Zod for Roompact MVP

import { z } from 'zod';

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

// ============================================
// HOUSE SCHEMAS
// ============================================

export const createHouseSchema = z.object({
    city: z.string().min(1, 'City is required').max(100),
    target_members: z.coerce.number().int().min(2, 'At least 2 members required').max(20),
});

export const createInviteSchema = z.object({
    house_id: z.string().uuid(),
    email: z.string().email().optional().or(z.literal('')),
    max_uses: z.coerce.number().int().min(1).max(100).default(1),
    expires_days: z.coerce.number().int().min(1).max(30).optional(),
});

// ============================================
// AGREEMENT SCHEMAS
// ============================================

export const createAgreementSchema = z.object({
    house_id: z.string().uuid(),
    title: z.string().min(1, 'Title is required').max(255),
    content: z.string().min(10, 'Content must be at least 10 characters'),
});

export const updateAgreementSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255).optional(),
    content: z.string().min(10, 'Content must be at least 10 characters').optional(),
    status: z.enum(['draft', 'active', 'superseded', 'archived']).optional(),
});

// ============================================
// RENT SCHEMAS
// ============================================

export const createRentCycleSchema = z.object({
    house_id: z.string().uuid(),
    name: z.string().min(1, 'Name is required').max(255),
    start_date: z.string().date('Invalid date format'),
    due_date: z.string().date('Invalid date format'),
    total_amount: z.coerce.number().positive('Amount must be positive'),
    notes: z.string().max(1000).optional(),
});

export const memberAmountSchema = z.object({
    user_id: z.string().uuid(),
    amount: z.coerce.number().min(0, 'Amount cannot be negative'),
});

export const updateRentEntrySchema = z.object({
    status: z.enum(['pending', 'paid', 'overdue', 'waived']),
    notes: z.string().max(500).optional(),
});

// ============================================
// CHORE SCHEMAS
// ============================================

export const createChoreSchema = z.object({
    house_id: z.string().uuid(),
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(1000).optional(),
    assigned_to: z.string().uuid().optional().or(z.literal('')),
    due_date: z.string().optional(),
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
});

export const updateChoreSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
    assigned_to: z.string().uuid().optional().nullable(),
    due_date: z.string().optional().nullable(),
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly']).optional(),
    status: z.enum(['pending', 'completed', 'missed']).optional(),
});

// ============================================
// NOTICE SCHEMAS
// ============================================

export const createNoticeSchema = z.object({
    house_id: z.string().uuid(),
    title: z.string().min(1, 'Title is required').max(255),
    content: z.string().min(1, 'Content is required'),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

// ============================================
// EXIT REQUEST SCHEMAS
// ============================================

export const createExitRequestSchema = z.object({
    house_id: z.string().uuid(),
    reason: z.string().max(1000).optional(),
    intended_exit_date: z.string().date('Invalid date format'),
});

export const reviewExitRequestSchema = z.object({
    status: z.enum(['approved', 'rejected']),
    review_notes: z.string().max(1000).optional(),
});

// ============================================
// PROFILE SCHEMAS
// ============================================

export const updateProfileSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100).optional(),
    bio: z.string().max(500).optional(),
    occupation: z.string().max(100).optional(),
});

// ============================================
// HELPER TYPES
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateHouseInput = z.infer<typeof createHouseSchema>;
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type CreateRentCycleInput = z.infer<typeof createRentCycleSchema>;
export type CreateChoreInput = z.infer<typeof createChoreSchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type CreateExitRequestInput = z.infer<typeof createExitRequestSchema>;
