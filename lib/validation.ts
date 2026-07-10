import { z } from 'zod'

export const coachMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(1000, 'Message is too long'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(30)
    .optional()
    .default([]),
})

export const companionMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(1000, 'Message is too long'),
  companionId: z.string().uuid('Invalid companion id'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(30)
    .optional()
    .default([]),
})

export const bioGeneratorSchema = z.object({
  interests: z.string().trim().min(1).max(300),
  personality: z.string().trim().min(1).max(300),
  goals: z.string().trim().max(300).optional().default(''),
  funFact: z.string().trim().max(300).optional().default(''),
})

export const paymentInitializeSchema = z.object({
  packageId: z.enum(['starter', 'popular', 'best_value', 'premium']),
})

export const paymentVerifySchema = z.object({
  reference: z.string().trim().min(1),
})

export const notificationsMarkReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100),
})

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(', ')
}
