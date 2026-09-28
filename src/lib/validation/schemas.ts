import { z } from 'zod';

export const ROLE = z.enum(['ENTREPRENEUR', 'INVESTOR']);
export const STAGE = z.enum(['IDEA', 'PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'GROWTH']);
export const CURRENCY = z.enum(['GBP', 'USD', 'EUR', 'INR', 'SGD']);
export const BUSINESS_MODEL = z.enum(['B2B_SAAS', 'B2C', 'MARKETPLACE', 'HARDWARE', 'DEEP_TECH', 'FINTECH_INFRA', 'SERVICES', 'OPEN_SOURCE']);
export const INVESTOR_TYPE = z.enum(['ANGEL', 'VENTURE_CAPITAL', 'MICRO_VC', 'FAMILY_OFFICE', 'CORPORATE_VC', 'ACCELERATOR', 'SYNDICATE', 'GOVERNMENT_FUND']);
export const GOAL = z.enum(['FUNDING', 'MENTORSHIP', 'PARTNERSHIPS', 'INTRODUCTIONS', 'HIRING', 'OTHER']);
export const VISIBILITY = z.enum(['PUBLIC', 'CONNECTION_ONLY', 'PRIVATE']);

const url = z.string().trim().url('Enter a full address starting with https://').max(300).optional().or(z.literal(''));

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'That password is too long')
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v), 'Mix upper and lower case')
  .refine((v) => /[0-9]/.test(v) || /[^A-Za-z0-9]/.test(v), 'Include a number or symbol')
  .refine((v) => !/^(password|doorkey|12345678)/i.test(v), 'Too easy to guess');

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2, 'Enter your name').max(80),
  role: ROLE,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password').max(200),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: passwordSchema,
});

export const profileBasicsSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter your name').max(80),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(1200, 'Keep this under 1200 characters').optional(),
  geographyId: z.string().uuid().optional().or(z.literal('')),
  linkedinUrl: url,
  websiteUrl: url,
  photoUrl: z.string().max(500).optional().or(z.literal('')),
});

export const startupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your startup name').max(100),
  oneLiner: z.string().trim().min(10, 'One sentence on what you do').max(160, 'Keep this to one line'),
  description: z.string().trim().max(3000).optional(),
  logoUrl: z.string().max(500).optional().or(z.literal('')),
  industryId: z.string().uuid('Choose an industry'),
  sectorIds: z.array(z.string().uuid()).min(1, 'Choose at least one sector').max(4, 'Choose up to four sectors'),
  geographyId: z.string().uuid('Choose a location'),
  stage: STAGE,
  businessModel: BUSINESS_MODEL,
  foundedYear: z.coerce.number().int().min(1990).max(new Date().getFullYear()).optional(),
  teamSize: z.coerce.number().int().min(1).max(10000).optional(),
  websiteUrl: url,
});

export const fundingSchema = z.object({
  amountRaised: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  amountSeeking: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  currency: CURRENCY,
  previousFunding: z.string().trim().max(500).optional(),
});

export const tractionSchema = z.object({
  revenueAnnual: z.coerce.number().int().min(0).max(10_000_000_000).optional(),
  userCount: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  customerCount: z.coerce.number().int().min(0).max(10_000_000).optional(),
  growthNote: z.string().trim().max(300).optional(),
  tractionNote: z.string().trim().max(800).optional(),
});

export const goalsSchema = z.object({
  goals: z.array(GOAL).min(1, 'Choose at least one').max(6),
});

export const investorSchema = z.object({
  investorType: INVESTOR_TYPE,
  organizationName: z.string().trim().max(120).optional(),
  thesis: z.string().trim().max(1500).optional(),
  expertise: z.array(z.string().trim().max(40)).max(10).default([]),
});

export const preferenceSchema = z.object({
  sectorIds: z.array(z.string().uuid()).min(1, 'Choose at least one sector').max(12),
  industryIds: z.array(z.string().uuid()).max(8).default([]),
  geographyIds: z.array(z.string().uuid()).min(1, 'Choose at least one location').max(12),
  stages: z.array(STAGE).min(1, 'Choose at least one stage'),
  minCheque: z.coerce.number().int().min(0).max(1_000_000_000),
  maxCheque: z.coerce.number().int().min(0).max(1_000_000_000),
  currency: CURRENCY,
}).refine((v) => v.maxCheque >= v.minCheque, {
  message: 'Maximum cheque must be at least the minimum',
  path: ['maxCheque'],
});

export const connectionRequestSchema = z.object({
  recipientId: z.string().uuid(),
  message: z.string().trim().max(600, 'Keep your note under 600 characters').optional(),
});

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1, 'Write a message').max(4000, 'Messages are limited to 4000 characters'),
});

export const introductionSchema = z.object({
  targetId: z.string().uuid(),
  message: z.string().trim().max(600).optional(),
});

export const reportSchema = z.object({
  subjectUserId: z.string().uuid().optional(),
  subjectStartupId: z.string().uuid().optional(),
  category: z.enum(['SPAM', 'FRAUD', 'HARASSMENT', 'MISREPRESENTATION', 'OTHER']),
  details: z.string().trim().max(1500).optional(),
}).refine((v) => v.subjectUserId || v.subjectStartupId, { message: 'Nothing was selected to report' });

export const discoverQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  sector: z.array(z.string()).optional(),
  industry: z.string().optional(),
  stage: z.array(STAGE).optional(),
  geography: z.array(z.string()).optional(),
  investorType: z.array(INVESTOR_TYPE).optional(),
  businessModel: z.array(BUSINESS_MODEL).optional(),
  minCheque: z.coerce.number().int().min(0).optional(),
  maxCheque: z.coerce.number().int().min(0).optional(),
  minSeeking: z.coerce.number().int().min(0).optional(),
  maxSeeking: z.coerce.number().int().min(0).optional(),
  hasTraction: z.coerce.boolean().optional(),
  sort: z.enum(['relevance', 'recent', 'name']).default('relevance'),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

export const privacySchema = z.object({
  visibility: VISIBILITY,
  showEmail: z.boolean(),
});

export const notificationPrefsSchema = z.object({
  notifyByEmail: z.boolean(),
  notifyOnMessage: z.boolean(),
  notifyOnRequest: z.boolean(),
  notifyOnMatch: z.boolean(),
});

export const aiProfileSchema = z.object({
  kind: z.enum(['bio', 'startup_description', 'one_liner', 'thesis']),
  rough: z.string().trim().min(20, 'Give us a bit more to work with').max(3000),
});

export const aiIntroSchema = z.object({
  recipientId: z.string().uuid(),
  context: z.string().trim().max(600).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
