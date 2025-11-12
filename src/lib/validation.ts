import { z } from 'zod';

/**
 * Username validation rules:
 * - 3-20 characters
 * - Letters, numbers, underscores only
 * - Must start with a letter or number
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_]*$/, 'Username must start with a letter or number and contain only letters, numbers, and underscores')
  .transform(val => val.toLowerCase());

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase();

/**
 * Password validation
 */
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long');

/**
 * Phone number validation (optional)
 */
export const phoneSchema = z
  .string()
  .regex(/^[\d\s\-\(\)\+]*$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

/**
 * URL validation (optional)
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

/**
 * Client registration validation schema
 */
export const clientRegistrationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: emailSchema,
  password: passwordSchema.optional(), // Optional for Google sign-in
  confirmPassword: z.string().optional(),
  phone: phoneSchema,
  location: z.string().max(100, 'Location is too long').optional().or(z.literal('')),
  userType: z.literal('client'),
}).refine(
  (data) => {
    // Only validate password match if password is provided (manual registration)
    if (data.password && data.password.length > 0) {
      return data.password === data.confirmPassword;
    }
    return true;
  },
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

/**
 * Technician registration validation schema
 */
export const technicianRegistrationSchema = z.object({
  // User info
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: emailSchema,
  password: passwordSchema.optional(), // Optional for Google sign-in
  confirmPassword: z.string().optional(),
  phone: phoneSchema,
  location: z.string().max(100, 'Location is too long').optional().or(z.literal('')),
  
  // Technician-specific required fields
  username: usernameSchema,
  businessName: z.string().min(1, 'Business name is required').max(100, 'Business name is too long'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional().or(z.literal('')),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description is too long'),
  businessAddress: z.string().min(1, 'Business address is required').max(200, 'Address is too long'),
  businessPhone: z.string().min(1, 'Business phone is required'),
  businessEmail: emailSchema,
  
  // Optional fields
  experience: z.string().max(100, 'Experience is too long').optional().or(z.literal('')),
  certifications: z.string().max(500, 'Certifications is too long').optional().or(z.literal('')),
  website: urlSchema,
  serviceArea: z.string().max(200, 'Service area is too long').optional().or(z.literal('')),
  hourlyRate: z.string().max(50, 'Hourly rate is too long').optional().or(z.literal('')),
  availability: z.string().max(200, 'Availability is too long').optional().or(z.literal('')),
  
  userType: z.literal('technician'),
}).refine(
  (data) => {
    // Only validate password match if password is provided (manual registration)
    if (data.password && data.password.length > 0) {
      return data.password === data.confirmPassword;
    }
    return true;
  },
  {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }
);

/**
 * Token send validation schema
 */
export const tokenSendSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
  tokens: z.number().int().min(1, 'Must send at least 1 token').max(10000, 'Cannot send more than 10,000 tokens at once'),
  message: z.string().max(500, 'Message is too long').optional().or(z.literal('')),
});

/**
 * Token purchase validation schema
 */
export const tokenPurchaseSchema = z.object({
  tokens: z.number().int().min(100, 'Minimum purchase is 100 tokens').max(100000, 'Maximum purchase is 100,000 tokens'),
  amount: z.number().positive('Amount must be positive'),
});

/**
 * Contact form validation schema
 */
export const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: emailSchema,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000, 'Message is too long'),
});

/**
 * Payout request validation schema
 */
export const payoutRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount exceeds maximum'),
  method: z.enum(['bank_transfer', 'paypal', 'stripe'], {
    message: 'Invalid payout method',
  }),
  accountDetails: z.string().min(1, 'Account details are required'),
});

/**
 * Profile update validation schema
 */
export const profileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  phone: phoneSchema,
  location: z.string().max(100, 'Location is too long').optional(),
  businessName: z.string().max(100, 'Business name is too long').optional(),
  about: z.string().max(1000, 'About section is too long').optional(),
  website: urlSchema,
  serviceArea: z.string().max(200, 'Service area is too long').optional(),
  hourlyRate: z.string().max(50, 'Hourly rate is too long').optional(),
  availability: z.string().max(200, 'Availability is too long').optional(),
});

/**
 * Helper function to validate and return errors in a user-friendly format
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.issues.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return { success: false, errors };
}

// Export types for use in components
export type ClientRegistrationData = z.infer<typeof clientRegistrationSchema>;
export type TechnicianRegistrationData = z.infer<typeof technicianRegistrationSchema>;
export type TokenSendData = z.infer<typeof tokenSendSchema>;
export type TokenPurchaseData = z.infer<typeof tokenPurchaseSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type PayoutRequestData = z.infer<typeof payoutRequestSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
