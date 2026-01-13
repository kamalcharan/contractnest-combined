# API Layer Patterns

## 🎯 API Purpose
API is the **external contract** of the system.
API defines: **What can be done** (not how it's done)

---

## ✅ CORRECT: Request/Response DTOs (Copy This)
```typescript
// types/contacts.dto.ts

// Request DTOs - what comes IN
export interface CreateContactRequest {
  name: string;
  email: string;
  phone?: string;
  company_id?: string;
}

export interface ListContactsRequest {
  limit?: number;   // Default: 50, Max: 100
  offset?: number;  // Default: 0
  search?: string;
  status?: 'active' | 'inactive';
}

// Response DTOs - what goes OUT
export interface ContactResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  created_at: string;
}

export interface ListContactsResponse {
  data: ContactResponse[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

export interface ErrorResponse {
  error: string;
  code?: string;
  fields?: Record<string, string>;  // Validation errors
}
```

---

## ✅ CORRECT: Input Validation (Copy This)
```typescript
// validation/contacts.validation.ts
import { z } from 'zod';

export const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  company_id: z.string().uuid().optional()
});

export const listContactsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional()
});

// Usage in handler
export async function validateRequest<T>(
  schema: z.Schema<T>, 
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: Record<string, string> }> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors: Record<string, string> = {};
    result.error.errors.forEach(err => {
      errors[err.path.join('.')] = err.message;
    });
    return { success: false, errors };
  }
  
  return { success: true, data: result.data };
}
```

---

## ✅ CORRECT: Error Response Standards (Copy This)
```typescript
// utils/errors.ts

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export function validationError(fields: Record<string, string>): Response {
  return Response.json({
    error: 'Validation failed',
    code: ErrorCodes.VALIDATION_ERROR,
    fields
  }, { status: 400 });
}

export function notFoundError(resource: string): Response {
  return Response.json({
    error: `${resource} not found`,
    code: ErrorCodes.NOT_FOUND
  }, { status: 404 });
}

export function unauthorizedError(): Response {
  return Response.json({
    error: 'Unauthorized',
    code: ErrorCodes.UNAUTHORIZED
  }, { status: 401 });
}

export function internalError(requestId?: string): Response {
  return Response.json({
    error: 'Internal server error',
    code: ErrorCodes.INTERNAL_ERROR,
    requestId
  }, { status: 500 });
}
```

---

## ✅ CORRECT: API Route Definition (Copy This)
```typescript
// routes/contacts.routes.ts

/**
 * @route GET /api/v1/contacts
 * @description List contacts with pagination
 * @query {number} limit - Max 100, default 50
 * @query {number} offset - Default 0
 * @query {string} search - Optional search term
 * @returns {ListContactsResponse}
 */

/**
 * @route POST /api/v1/contacts
 * @description Create a new contact
 * @body {CreateContactRequest}
 * @returns {ContactResponse}
 */

/**
 * @route GET /api/v1/contacts/:id
 * @description Get single contact by ID
 * @param {string} id - Contact UUID
 * @returns {ContactResponse}
 */
```

---

## ❌ WRONG: Business Logic in API Layer
```typescript
// FORBIDDEN - Logic belongs in DB or service layer
export async function createContact(req: Request) {
  const body = await req.json();
  
  // ❌ Business logic in API layer
  if (body.email.endsWith('@competitor.com')) {
    body.status = 'blocked';
  }
  
  // ❌ Data transformation in API layer
  body.name = body.name.trim().toUpperCase();
  
  // ❌ Complex validation with DB calls
  const existing = await db.query('SELECT id FROM contacts WHERE email = $1', [body.email]);
  if (existing.rows.length > 0) {
    // ... handle duplicate
  }
}
```

---

## ✅ API Checklist
Before submitting API code:
- [ ] Request DTO defined with types
- [ ] Response DTO defined with types
- [ ] Zod validation schema created
- [ ] Error responses use standard format
- [ ] No business logic in API layer
- [ ] API docs/comments included
- [ ] Versioned route (/v1/, /v2/)
