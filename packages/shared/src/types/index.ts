import { z } from 'zod';

// Organization
export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  avatarUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

// User
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  githubId: z.string().optional(),
  gitlabId: z.string().optional(),
  telegramChatId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

// Membership
export const MembershipRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;

export const MembershipSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: MembershipRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Membership = z.infer<typeof MembershipSchema>;

// Repository
export const RepositoryTypeSchema = z.enum(['library', 'application', 'monorepo', 'docs', 'custom']);
export type RepositoryType = z.infer<typeof RepositoryTypeSchema>;

export const RepositorySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  provider: z.enum(['github', 'gitlab']),
  providerRepoId: z.string(),
  name: z.string(),
  fullName: z.string(),
  url: z.string().url(),
  defaultBranch: z.string().default('main'),
  type: RepositoryTypeSchema,
  isActive: z.boolean().default(true),
  eventSources: z.record(z.boolean()).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Repository = z.infer<typeof RepositorySchema>;

// Content Piece
export const ContentTypeSchema = z.enum(['release_notes', 'technical_article', 'product_announcement', 'tutorial']);
export type ContentType = z.infer<typeof ContentTypeSchema>;

export const ContentStatusSchema = z.enum(['draft', 'in_review', 'approved', 'changes_requested', 'rejected', 'scheduled', 'published', 'failed']);
export type ContentStatus = z.infer<typeof ContentStatusSchema>;

export const ContentPieceSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  repositoryId: z.string().uuid().optional(),
  title: z.string(),
  slug: z.string(),
  contentType: ContentTypeSchema,
  status: ContentStatusSchema,
  content: z.string(), // Markdown
  contentHtml: z.string().optional(),
  frontMatter: z.record(z.unknown()).optional(),
  targetChannels: z.array(z.string()).default([]),
  scheduledAt: z.date().optional(),
  publishedAt: z.date().optional(),
  promptVersionId: z.string().uuid().optional(),
  triggeringEventId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ContentPiece = z.infer<typeof ContentPieceSchema>;

// Content Version
export const ContentVersionSchema = z.object({
  id: z.string().uuid(),
  contentPieceId: z.string().uuid(),
  content: z.string(),
  contentHtml: z.string().optional(),
  frontMatter: z.record(z.unknown()).optional(),
  editorId: z.string().uuid(),
  changeSummary: z.string().optional(),
  createdAt: z.date(),
});
export type ContentVersion = z.infer<typeof ContentVersionSchema>;

// Content Review
export const ReviewActionSchema = z.enum(['approve', 'request_changes', 'reject']);
export type ReviewAction = z.infer<typeof ReviewActionSchema>;

export const ContentReviewSchema = z.object({
  id: z.string().uuid(),
  contentPieceId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  action: ReviewActionSchema,
  comment: z.string().optional(),
  createdAt: z.date(),
});
export type ContentReview = z.infer<typeof ContentReviewSchema>;

// Repo Event
export const RepoEventTypeSchema = z.enum(['push', 'pull_request_merged', 'release', 'tag', 'changelog']);
export type RepoEventType = z.infer<typeof RepoEventTypeSchema>;

export const RepoEventSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  type: RepoEventTypeSchema,
  providerEventId: z.string(),
  payload: z.record(z.unknown()),
  processedAt: z.date().optional(),
  createdAt: z.date(),
});
export type RepoEvent = z.infer<typeof RepoEventSchema>;

// Publishing Channel
export const ChannelTypeSchema = z.enum(['blog', 'social', 'newsletter', 'webhook']);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

export const PublishingChannelSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  type: ChannelTypeSchema,
  config: z.record(z.unknown()),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PublishingChannel = z.infer<typeof PublishingChannelSchema>;

// Prompt Version
export const PromptTypeSchema = z.enum(['system', 'content_type', 'repo_override']);
export type PromptType = z.infer<typeof PromptTypeSchema>;

export const PromptVersionSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  repositoryId: z.string().uuid().optional(),
  name: z.string(),
  type: PromptTypeSchema,
  contentType: ContentTypeSchema.optional(),
  template: z.string(),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  version: z.number().int().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type PromptVersion = z.infer<typeof PromptVersionSchema>;

// Notification
export const NotificationChannelSchema = z.enum(['email', 'telegram', 'discord', 'teams', 'in_app', 'webhook']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationEventSchema = z.enum([
  'draft_created',
  'review_requested',
  'publish_scheduled',
  'publish_due',
  'publish_failed',
  'review_completed',
]);
export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  event: NotificationEventSchema,
  channel: NotificationChannelSchema,
  payload: z.record(z.unknown()),
  status: z.enum(['pending', 'sent', 'failed']).default('pending'),
  sentAt: z.date().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// API Response
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    }).optional(),
    meta: z.object({
      timestamp: z.string(),
      requestId: z.string(),
    }).optional(),
  });
export type ApiResponse<T> = z.infer<ReturnType<typeof ApiResponseSchema<z.ZodTypeAny>>>;

// Pagination
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });

// Repo Sync State
export const RepoSyncStateSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  lastSyncedAt: z.date(),
  lastSyncedSha: z.string().optional(),
  lastSyncedTag: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type RepoSyncState = z.infer<typeof RepoSyncStateSchema>;