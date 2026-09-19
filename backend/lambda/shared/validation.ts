import { z } from 'zod';

// ─── Contact schemas ───────────────────────────────────────────────────────────

export const CreateContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().min(7, 'Phone number is required').max(20).regex(
    /^\+?[0-9\s\-().]+$/,
    'Invalid phone number format',
  ),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  relationship: z.string().max(50).optional(),
  priority: z.number().int().min(1).max(10).default(1),
  enabled: z.boolean().default(true),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = CreateContactSchema.partial();
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

// ─── Profile schemas ───────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(7).max(20).regex(/^\+?[0-9\s\-().]+$/).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ─── Trip schemas ──────────────────────────────────────────────────────────────

export const CreateTripSchema = z.object({
  tripId: z.string().min(1, 'tripId is required').max(100),
  startTime: z.string().datetime({ message: 'startTime must be ISO 8601' }),
});

export type CreateTripInput = z.infer<typeof CreateTripSchema>;

export const UpdateTripSchema = z.object({
  endTime: z.string().datetime({ message: 'endTime must be ISO 8601' }).optional(),
  duration: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  alertCount: z.number().int().min(0).optional(),
  emergencyTriggered: z.boolean().optional(),
  safeWindows: z.number().int().min(0).optional(),
});

export type UpdateTripInput = z.infer<typeof UpdateTripSchema>;

// ─── Incident schemas ──────────────────────────────────────────────────────────

export const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
});

export const CreateIncidentSchema = z.object({
  tripId: z.string().max(100).optional(),
  clientIncidentId: z.string().max(100).optional(),  // idempotency key
  status: z.enum(['EMERGENCY', 'ALERT']).default('EMERGENCY'),
  confidence: z.number().min(0).max(1, 'Confidence must be 0.0–1.0'),
  location: LocationSchema.optional(),
  detectedAt: z.string().datetime({ message: 'detectedAt must be ISO 8601' }),
});

export type CreateIncidentInput = z.infer<typeof CreateIncidentSchema>;

// ─── Shared validation helper ──────────────────────────────────────────────────

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const field = firstIssue?.path.join('.') ?? 'unknown';
    return { error: `${field}: ${firstIssue?.message ?? 'Invalid value'}` };
  }
  return { data: result.data };
}
