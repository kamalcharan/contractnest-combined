# n8n Workflow Import Instructions

## Overview

This folder contains n8n workflow JSON files for ContractNest profile processing.

## Workflows

| File | Purpose | Webhook Endpoint |
|------|---------|------------------|
| `process-profile.json` | Unified profile processing (manual + website) | `/webhook/process-profile` |

---

## Step-by-Step Import Guide

### Step 1: Open n8n Dashboard

1. Navigate to your n8n instance (e.g., `https://your-n8n-instance.com`)
2. Log in with your credentials

### Step 2: Import the Workflow

1. Click **"Add Workflow"** (+ button) in the top right
2. Click the **three dots menu** (⋮) → **"Import from File"**
3. Select `process-profile.json` from this folder
4. The workflow will open in the editor

### Step 3: Configure OpenAI Credentials

The workflow uses OpenAI for AI processing. You need to set up credentials:

1. Click on any **OpenAI node** (yellow nodes: "AI Extract Website Content" or "AI Enhance Profile")
2. In the right panel, click **"Credential to connect with"**
3. Click **"Create New Credential"**
4. Enter:
   - **Name**: `OpenAI API`
   - **API Key**: Your OpenAI API key
5. Click **"Save"**
6. The credential will auto-apply to all OpenAI nodes

### Step 4: Test the Webhook URL

1. Click on the **"Webhook Trigger"** node (first node)
2. Copy the **Webhook URL** shown (e.g., `https://your-n8n.com/webhook/process-profile`)
3. Note this URL - you'll need it for the UI configuration

### Step 5: Activate the Workflow

1. Toggle the **"Active"** switch in the top right to ON
2. The workflow is now live and listening for requests

---

## API Usage

### Endpoint
```
POST /webhook/process-profile
```

### Request Body - Manual Text Enhancement

```json
{
  "type": "manual",
  "content": "I run a small accounting firm specializing in tax preparation for small businesses...",
  "userId": "user-uuid-here",
  "groupId": "group-uuid-here"
}
```

### Request Body - Website Scraping

```json
{
  "type": "website",
  "websiteUrl": "https://example-business.com",
  "userId": "user-uuid-here",
  "groupId": "group-uuid-here"
}
```

### Response (Success)

```json
{
  "status": "success",
  "enhancedContent": "**Your Trusted Partner in Small Business Accounting**\n\nWe specialize in comprehensive tax preparation and financial services tailored specifically for small businesses...",
  "originalContent": "I run a small accounting firm specializing in tax preparation...",
  "userId": "user-uuid-here",
  "groupId": "group-uuid-here",
  "sourceUrl": ""
}
```

### Response (Error)

```json
{
  "status": "error",
  "message": "An error occurred processing your request"
}
```

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROCESS PROFILE WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐      ┌───────────────┐                                   │
│   │   Webhook    │──────│  Route by     │                                   │
│   │   Trigger    │      │  Type         │                                   │
│   └──────────────┘      └───────┬───────┘                                   │
│                                 │                                           │
│                    ┌────────────┴────────────┐                              │
│                    │                         │                              │
│                    ▼                         ▼                              │
│           ┌───────────────┐         ┌───────────────┐                       │
│           │ Set Manual    │         │ Scrape        │                       │
│           │ Content       │         │ Website       │                       │
│           └───────┬───────┘         └───────┬───────┘                       │
│                   │                         │                               │
│                   │                         ▼                               │
│                   │                 ┌───────────────┐                       │
│                   │                 │ AI Extract    │                       │
│                   │                 │ Website       │                       │
│                   │                 └───────┬───────┘                       │
│                   │                         │                               │
│                   │                         ▼                               │
│                   │                 ┌───────────────┐                       │
│                   │                 │ Set Website   │                       │
│                   │                 │ Content       │                       │
│                   │                 └───────┬───────┘                       │
│                   │                         │                               │
│                   └────────────┬────────────┘                               │
│                                │                                            │
│                                ▼                                            │
│                       ┌───────────────┐                                     │
│                       │ Merge Paths   │                                     │
│                       └───────┬───────┘                                     │
│                               │                                             │
│                               ▼                                             │
│                       ┌───────────────┐                                     │
│                       │ AI Enhance    │                                     │
│                       │ Profile       │                                     │
│                       └───────┬───────┘                                     │
│                               │                                             │
│                               ▼                                             │
│                       ┌───────────────┐                                     │
│                       │ Prepare       │                                     │
│                       │ Response      │                                     │
│                       └───────┬───────┘                                     │
│                               │                                             │
│                               ▼                                             │
│                       ┌───────────────┐                                     │
│                       │ Respond       │                                     │
│                       │ Success       │                                     │
│                       └───────────────┘                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UI Integration

After importing and activating the workflow, update your UI to call this endpoint.

### Environment Variable

Add to your `.env` or environment config:

```env
VITE_N8N_PROFILE_WEBHOOK_URL=https://your-n8n-instance.com/webhook/process-profile
```

### Example Fetch Call (TypeScript)

```typescript
const processProfile = async (
  type: 'manual' | 'website',
  content: string,
  userId: string,
  groupId: string,
  websiteUrl?: string
) => {
  const response = await fetch(import.meta.env.VITE_N8N_PROFILE_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      content: type === 'manual' ? content : undefined,
      websiteUrl: type === 'website' ? websiteUrl : undefined,
      userId,
      groupId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to process profile');
  }

  return response.json();
};
```

---

## Troubleshooting

### "Credential not found" Error
- Re-create the OpenAI credential and re-assign it to both AI nodes

### Webhook not responding
- Ensure the workflow is **Active** (toggle ON)
- Check the webhook URL is correct (with /webhook/ prefix)

### Website scraping fails
- Some websites block automated requests
- Try adding headers or use a different scraping approach

### AI response is empty
- Check OpenAI API key is valid
- Check you have sufficient API credits

---

## Alternative: Using Claude Instead of OpenAI

If you prefer to use Claude (Anthropic) instead of OpenAI:

1. Install the **Anthropic node** in n8n (if not already available)
2. Replace the OpenAI nodes with Anthropic nodes
3. Update the credential to use your Anthropic API key
4. The prompts can remain the same

---

## Next Steps After Import

1. ✅ Import workflow
2. ✅ Configure OpenAI credentials
3. ✅ Activate workflow
4. ✅ Note webhook URL
5. 🔲 Update UI environment variable
6. 🔲 Test from UI
7. 🔲 Monitor executions in n8n

---

## Support

If you encounter issues:
1. Check n8n execution logs (click on workflow → Executions)
2. Verify all credentials are properly configured
3. Test with Postman/curl first before UI integration
