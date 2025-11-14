# Impact Analysis: Channels for Tenants
**Project**: ContractNest - Tenant Channels Integration
**Date**: November 14, 2025
**Version**: 1.0
**Status**: Planning Phase

---

## Executive Summary

This document outlines the impact analysis for implementing **Channels for Tenants**, a multi-channel communication and integration platform that enables ContractNest tenants to:

1. **Website Integration** - Extend contracts and integrate ContractNest into customer websites
2. **Chat Bot** - AI-powered customer support, sales, and informational services
3. **WhatsApp Bot** - WhatsApp-based customer engagement with semantic clustering
4. **WhatsApp Groups** - Admin-managed groups with password-protected invites (BBB subset model)

---

## 1. FEATURE OVERVIEW

### 1.1 Business Objectives

- **Revenue Stream**: Position as paid feature (currently open for development/early access)
- **Customer Engagement**: Multi-channel tenant-customer communication
- **Market Differentiation**: Comprehensive channel strategy vs. competitors
- **Data Intelligence**: Build semantic clustering for user profiles and services

### 1.2 Target Users

- **Primary**: Existing tenants with customer-facing businesses
- **Secondary**: New enterprise tenants requiring multi-channel support
- **Tertiary**: BBB group members (subset model with exclusive access)

### 1.3 Core Components

| Component | Purpose | Integration Type |
|-----------|---------|------------------|
| **Website Widget** | Embed contract extensions on customer sites | PHP, React, JavaScript, WIX |
| **Chat Bot** | Conversational AI for support/sales | Web-based widget |
| **WhatsApp Bot** | WhatsApp Business API integration | N8N workflow + Meta API |
| **WhatsApp Groups** | Community management with access control | Password-protected invites |

---

## 2. TECHNICAL ARCHITECTURE

### 2.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     VaNi Menu System                         │
│                    /vani/channels                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┬───────────────┬──────────┐
           ▼                       ▼               ▼          ▼
    ┌─────────────┐       ┌──────────────┐  ┌──────────┐  ┌─────────────┐
    │  Website    │       │   Chat Bot   │  │ WhatsApp │  │  WhatsApp   │
    │ Integration │       │  Service     │  │   Bot    │  │   Groups    │
    └─────────────┘       └──────────────┘  └──────────┘  └─────────────┘
           │                       │               │              │
           │                       │               │              │
    ┌──────▼───────┐       ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
    │ Widget SDKs  │       │  AI Engine  │ │ N8N       │ │ Invite Mgmt │
    │ - React      │       │  - Semantic │ │ Workflow  │ │ - Password  │
    │ - JavaScript │       │  - Context  │ │ - Meta    │ │ - Members   │
    │ - PHP        │       │  - Profile  │ │   API     │ │ - Subset    │
    │ - WIX        │       └─────────────┘ └───────────┘ └─────────────┘
    └──────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React, TypeScript | Landing pages, widget SDK |
| **Backend API** | Node.js, Supabase Edge Functions | Integration APIs |
| **Workflow Engine** | N8N (separate server) | WhatsApp automation |
| **AI/NLP** | LLM (GPT-4/Claude) + Semantic DB | Chatbot intelligence |
| **Messaging** | WhatsApp Business API, Meta Cloud API | WhatsApp integration |
| **Widget SDK** | React Components, Vanilla JS | Embeddable widgets |

### 2.3 Integration Points

#### Website Integration
```typescript
// React Example
import { ContractNestWidget } from '@contractnest/react-widget';

function App() {
  return (
    <ContractNestWidget
      tenantId="tenant_xxx"
      apiKey="pk_xxx"
      theme="auto"
    />
  );
}

// JavaScript Example
<script src="https://cdn.contractnest.com/widget.js"></script>
<script>
  ContractNest.init({
    tenantId: 'tenant_xxx',
    apiKey: 'pk_xxx'
  });
</script>

// PHP Example
<?php
require_once 'contractnest-php-sdk/autoload.php';
$widget = new ContractNest\Widget([
  'tenant_id' => 'tenant_xxx',
  'api_key' => 'pk_xxx'
]);
echo $widget->render();
?>

// WIX Example (via widget iframe)
```

#### WhatsApp Bot Flow (N8N)
```json
{
  "workflow": "WhatsApp Tenant Bot",
  "trigger": "webhook",
  "nodes": [
    {
      "name": "Receive Message",
      "type": "whatsapp-webhook"
    },
    {
      "name": "Intent Recognition",
      "type": "ai-classifier",
      "prompts": {
        "core_contractnest": "General ContractNest queries",
        "bbb_group": "BBB-specific intents (trigger: 'Hi BBB')"
      }
    },
    {
      "name": "Context Builder",
      "type": "function",
      "fetch": [
        "tenant_profile",
        "user_services",
        "semantic_clusters",
        "brochures"
      ]
    },
    {
      "name": "LLM Response",
      "type": "openai-chat"
    },
    {
      "name": "Send WhatsApp Reply",
      "type": "whatsapp-send"
    }
  ]
}
```

---

## 3. DATABASE SCHEMA CHANGES

### 3.1 New Tables

#### `channel_integrations`
```sql
CREATE TABLE channel_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type VARCHAR(50) NOT NULL, -- 'website', 'chatbot', 'whatsapp_bot', 'whatsapp_group'
  status VARCHAR(20) NOT NULL DEFAULT 'inactive', -- 'active', 'inactive', 'configuring', 'error'

  -- Configuration (JSONB for flexibility)
  config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- Website: { "allowed_domains": ["example.com"], "widget_theme": "auto", "api_keys": [...] }
  -- WhatsApp: { "phone_number": "+91...", "business_account_id": "...", "webhook_url": "..." }
  -- Chat Bot: { "ai_model": "gpt-4", "training_docs": [...], "fallback_behavior": "..." }

  -- Access Control (for WhatsApp groups)
  access_control JSONB DEFAULT '{}',
  -- Example: { "password": "bagyanagar", "allowed_members": [...], "is_subset": true }

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(tenant_id, channel_type)
);

CREATE INDEX idx_channel_integrations_tenant ON channel_integrations(tenant_id);
CREATE INDEX idx_channel_integrations_status ON channel_integrations(status);
```

#### `channel_analytics`
```sql
CREATE TABLE channel_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES channel_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Metrics
  metric_date DATE NOT NULL,
  total_interactions INTEGER DEFAULT 0,
  successful_interactions INTEGER DEFAULT 0,
  failed_interactions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,

  -- Channel-specific metrics (JSONB)
  custom_metrics JSONB DEFAULT '{}',
  -- Website: { "widget_loads": 100, "contracts_viewed": 50, "conversions": 10 }
  -- WhatsApp: { "messages_sent": 200, "messages_received": 150, "media_shared": 20 }

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(integration_id, metric_date)
);

CREATE INDEX idx_channel_analytics_tenant_date ON channel_analytics(tenant_id, metric_date DESC);
```

#### `channel_user_profiles`
```sql
-- User-driven profile building capability
CREATE TABLE channel_user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- User identification (from channel)
  channel_type VARCHAR(50) NOT NULL,
  channel_user_id VARCHAR(255) NOT NULL, -- WhatsApp number, email, etc.

  -- Profile data
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  website_url VARCHAR(500),

  -- Semantic clustering
  profile_embedding VECTOR(1536), -- For semantic search (pgvector extension)
  interests TEXT[],
  intent_history JSONB DEFAULT '[]',

  -- Onboarding
  onboarding_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  onboarding_data JSONB DEFAULT '{}',

  -- Documents/Brochures
  uploaded_documents JSONB DEFAULT '[]',
  -- Example: [{ "url": "s3://...", "type": "brochure", "extracted_text": "..." }]

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, channel_type, channel_user_id)
);

CREATE INDEX idx_channel_user_profiles_tenant ON channel_user_profiles(tenant_id);
CREATE INDEX idx_channel_user_profiles_channel_user ON channel_user_profiles(channel_type, channel_user_id);
-- For semantic search (requires pgvector extension)
CREATE INDEX idx_channel_user_profiles_embedding ON channel_user_profiles USING ivfflat (profile_embedding vector_cosine_ops);
```

#### `whatsapp_group_invites`
```sql
CREATE TABLE whatsapp_group_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES channel_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Invite details
  group_name VARCHAR(255) NOT NULL,
  group_description TEXT,
  invite_password VARCHAR(255) NOT NULL, -- e.g., "bagyanagar"
  whatsapp_group_id VARCHAR(255), -- Meta Group ID after creation

  -- Access control
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER,
  current_members INTEGER DEFAULT 0,

  -- Member tracking
  members JSONB DEFAULT '[]',
  -- Example: [{ "phone": "+91...", "joined_at": "...", "user_profile_id": "..." }]

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_whatsapp_group_invites_tenant ON whatsapp_group_invites(tenant_id);
CREATE INDEX idx_whatsapp_group_invites_password ON whatsapp_group_invites(invite_password);
```

#### `channel_conversation_logs`
```sql
CREATE TABLE channel_conversation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_id UUID NOT NULL REFERENCES channel_integrations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_profile_id UUID REFERENCES channel_user_profiles(id),

  -- Conversation metadata
  conversation_id VARCHAR(255) NOT NULL, -- Session ID
  channel_type VARCHAR(50) NOT NULL,

  -- Message data
  message_type VARCHAR(20) NOT NULL, -- 'user', 'bot', 'system'
  message_content TEXT NOT NULL,
  message_metadata JSONB DEFAULT '{}',
  -- Example: { "intent": "support", "confidence": 0.95, "entities": {...} }

  -- AI context
  context_snapshot JSONB DEFAULT '{}',
  -- Example: { "tenant_info": {...}, "user_services": [...], "current_intent": "..." }

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_channel_conversation_logs_conversation ON channel_conversation_logs(conversation_id);
CREATE INDEX idx_channel_conversation_logs_tenant_date ON channel_conversation_logs(tenant_id, created_at DESC);
```

### 3.2 Modified Tables

#### `tenants` - Add Channel Preferences
```sql
ALTER TABLE tenants
ADD COLUMN channel_preferences JSONB DEFAULT '{}';
-- Example: { "enabled_channels": ["website", "whatsapp_bot"], "branding": {...} }
```

#### `users` - Add Channel Access
```sql
ALTER TABLE users
ADD COLUMN channel_access JSONB DEFAULT '{}';
-- Example: { "can_manage_channels": true, "allowed_channels": ["website", "chatbot"] }
```

---

## 4. API ENDPOINTS

### 4.1 New API Routes

#### Channel Management APIs
```
POST   /api/v1/channels/integrations              # Create new integration
GET    /api/v1/channels/integrations              # List all integrations
GET    /api/v1/channels/integrations/:id          # Get integration details
PATCH  /api/v1/channels/integrations/:id          # Update integration
DELETE /api/v1/channels/integrations/:id          # Delete integration
POST   /api/v1/channels/integrations/:id/test     # Test integration

# Website Widget APIs
GET    /api/v1/channels/widget/config             # Get widget configuration
POST   /api/v1/channels/widget/track-event        # Track widget events
GET    /api/v1/channels/widget/contracts          # Get embeddable contracts

# Chat Bot APIs
POST   /api/v1/channels/chatbot/message           # Send message to bot
GET    /api/v1/channels/chatbot/conversation/:id  # Get conversation history
POST   /api/v1/channels/chatbot/train             # Upload training documents
GET    /api/v1/channels/chatbot/intents           # Get recognized intents

# WhatsApp Bot APIs
POST   /api/v1/channels/whatsapp/webhook          # WhatsApp webhook receiver
POST   /api/v1/channels/whatsapp/send             # Send WhatsApp message
GET    /api/v1/channels/whatsapp/templates        # Get message templates
POST   /api/v1/channels/whatsapp/media            # Upload media

# WhatsApp Group APIs
POST   /api/v1/channels/whatsapp-groups           # Create group invite
GET    /api/v1/channels/whatsapp-groups           # List groups
POST   /api/v1/channels/whatsapp-groups/join      # Join group with password
POST   /api/v1/channels/whatsapp-groups/:id/members # Add/remove members

# User Profile APIs
POST   /api/v1/channels/profiles                  # Create/update user profile
GET    /api/v1/channels/profiles/:id              # Get user profile
POST   /api/v1/channels/profiles/:id/documents    # Upload documents
GET    /api/v1/channels/profiles/search           # Semantic search

# Analytics APIs
GET    /api/v1/channels/analytics                 # Get channel analytics
GET    /api/v1/channels/analytics/export          # Export analytics data
```

### 4.2 Public Embedding APIs
```
# Widget Embedding (CORS-enabled)
GET    /embed/widget.js                           # Widget SDK JavaScript
GET    /embed/widget.css                          # Widget styles
POST   /embed/api/init                            # Initialize widget
POST   /embed/api/contracts                       # Fetch contracts for widget

# Public webhook endpoints (authenticated via signature)
POST   /webhooks/whatsapp/:tenant_id              # WhatsApp webhook
POST   /webhooks/chatbot/:tenant_id               # Chatbot webhook
```

---

## 5. FRONTEND COMPONENTS

### 5.1 New Pages/Routes

```
/vani/channels                         # Main Channels Dashboard (already exists)
/vani/channels/website                 # Website Integration Landing Page
/vani/channels/chatbot                 # Chat Bot Integration Landing Page
/vani/channels/whatsapp                # WhatsApp Integration Landing Page
/vani/channels/whatsapp-groups         # WhatsApp Groups Management

# Configuration Pages
/vani/channels/:type/setup             # Setup wizard
/vani/channels/:type/customize         # Customization settings
/vani/channels/:type/analytics         # Channel-specific analytics
/vani/channels/:type/test              # Testing interface

# Public Interest Pages (for lead generation)
/channels/website/interest             # Express interest in Website Integration
/channels/chatbot/interest             # Express interest in Chat Bot
/channels/whatsapp/interest            # Express interest in WhatsApp
```

### 5.2 New Components

```typescript
// VaNi Channels Menu Structure
src/vani/pages/
├── channels/
│   ├── ChannelsDashboard.tsx           # Overview of all channels
│   ├── WebsiteIntegrationPage.tsx      # Website integration landing + setup
│   ├── ChatBotIntegrationPage.tsx      # Chat bot landing + setup
│   ├── WhatsAppIntegrationPage.tsx     # WhatsApp bot landing + setup
│   ├── WhatsAppGroupsPage.tsx          # Group management
│   └── ChannelSetupWizard.tsx          # Generic setup wizard

src/vani/components/channels/
├── WebsiteWidgetPreview.tsx            # Preview widget appearance
├── ChatBotTrainer.tsx                  # Upload docs, train bot
├── WhatsAppConfigForm.tsx              # WhatsApp Business config
├── GroupInviteManager.tsx              # Password-protected invites
├── ChannelAnalyticsChart.tsx           # Charts for analytics
├── UserProfileBuilder.tsx              # User onboarding form
└── IntegrationCodeSnippet.tsx          # Copy-paste code snippets

// Public Landing Pages (for interest expression)
src/pages/public/channels/
├── WebsiteInterestLanding.tsx          # CRO-optimized website landing
├── ChatBotInterestLanding.tsx          # CRO-optimized chatbot landing
└── WhatsAppInterestLanding.tsx         # CRO-optimized WhatsApp landing

// Widget SDK (separate package)
packages/widget-sdk/
├── src/
│   ├── ContractWidget.tsx              # Main widget component
│   ├── ChatInterface.tsx               # Chat UI
│   ├── ContractList.tsx                # Contract display
│   └── index.ts                        # SDK exports
├── dist/
│   ├── widget.js                       # Vanilla JS build
│   ├── widget.esm.js                   # ES module build
│   └── widget.css                      # Styles
└── examples/
    ├── react/                          # React integration example
    ├── javascript/                     # Vanilla JS example
    ├── php/                            # PHP example
    └── wix/                            # WIX integration example
```

---

## 6. IMPLEMENTATION PHASES

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Set up core infrastructure and landing pages

- [ ] Database schema migration
- [ ] Create channel integrations table structure
- [ ] Build VaNi submenu: Channels → Website, WhatsApp, Bot
- [ ] Create 3 CRO-enabled landing pages (interest expression)
- [ ] Set up API endpoint structure
- [ ] Configure N8N server (separate instance)

**Deliverables**:
- ✅ Landing pages live for lead generation
- ✅ Database ready for integrations
- ✅ Menu structure updated

### Phase 2: Website Integration (Weeks 3-4)
**Goal**: Build embeddable widget SDK

- [ ] Create React widget SDK
- [ ] Build vanilla JavaScript version
- [ ] PHP integration library
- [ ] WIX iframe integration
- [ ] Widget customization UI
- [ ] Analytics tracking
- [ ] Documentation and examples

**Deliverables**:
- ✅ SDK published to npm (@contractnest/widget-sdk)
- ✅ Integration examples for all platforms
- ✅ Admin UI for widget configuration

### Phase 3: Chat Bot (Weeks 5-7)
**Goal**: AI-powered customer support bot

- [ ] AI model selection and training pipeline
- [ ] Semantic clustering for user profiles
- [ ] Context-aware conversation engine
- [ ] Document/brochure ingestion system
- [ ] User profile builder (onboarding)
- [ ] Intent recognition and routing
- [ ] Chat UI component
- [ ] Admin training interface

**Deliverables**:
- ✅ Functional chatbot with AI
- ✅ User profile building capability
- ✅ Admin can upload training data
- ✅ Semantic search working

### Phase 4: WhatsApp Bot (Weeks 8-10)
**Goal**: WhatsApp Business API integration

- [ ] N8N workflow configuration
- [ ] Meta WhatsApp Business API setup
- [ ] Webhook processing
- [ ] Intent recognition (reuse from chatbot)
- [ ] Context-aware responses
- [ ] Media handling (images, documents)
- [ ] Template message management
- [ ] Conversation logging

**Deliverables**:
- ✅ WhatsApp bot operational
- ✅ N8N workflows configured
- ✅ Admin can manage templates

### Phase 5: WhatsApp Groups (Weeks 11-12)
**Goal**: Password-protected group invites (BBB model)

- [ ] Group invite system
- [ ] Password protection ("bagyanagar")
- [ ] Member management
- [ ] BBB subset intent recognition ("Hi BBB")
- [ ] Core ContractNest intents (default)
- [ ] Group analytics
- [ ] Admin controls

**Deliverables**:
- ✅ WhatsApp groups with invite system
- ✅ Password protection working
- ✅ BBB subset functionality

### Phase 6: Analytics & Optimization (Weeks 13-14)
**Goal**: Comprehensive analytics and performance tuning

- [ ] Channel-specific dashboards
- [ ] Cross-channel analytics
- [ ] ROI calculation tools
- [ ] Performance optimization
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation finalization

**Deliverables**:
- ✅ Analytics dashboards complete
- ✅ Performance benchmarks met
- ✅ Security review passed

### Phase 7: Beta Testing & Launch (Weeks 15-16)
**Goal**: Production-ready launch

- [ ] Beta testing with select tenants
- [ ] Bug fixes and polish
- [ ] Pricing model finalization
- [ ] Marketing collateral
- [ ] Sales enablement
- [ ] Launch event/announcement

**Deliverables**:
- ✅ Production launch
- ✅ Pricing tiers defined
- ✅ Marketing materials ready

---

## 7. DEPENDENCIES & INTEGRATIONS

### 7.1 External Services

| Service | Purpose | Cost Estimate |
|---------|---------|---------------|
| **WhatsApp Business API** | Meta Cloud API | $0.005 - $0.05 per message |
| **OpenAI API / Anthropic Claude** | Chatbot AI | $0.01 - $0.03 per 1K tokens |
| **N8N Cloud** | Workflow automation | $20/month (self-hosted: free) |
| **Pinecone / Weaviate** | Vector database for semantic search | $70/month (starter) |
| **Twilio** | SMS fallback, phone verification | $0.0075 per SMS |
| **CDN (Cloudflare)** | Widget SDK distribution | Free tier available |
| **Firebase / S3** | Document storage | $0.023 per GB |

### 7.2 Infrastructure Requirements

- **N8N Server**: Separate instance (Dockerized, 2GB RAM minimum)
- **Vector Database**: For semantic search (pgvector extension in Supabase or external service)
- **CDN**: For widget SDK delivery (global edge caching)
- **Webhook Handlers**: Supabase Edge Functions (serverless)
- **Background Jobs**: For document processing, AI training

---

## 8. SECURITY & COMPLIANCE

### 8.1 Security Considerations

**Authentication & Authorization**:
- API key-based authentication for widget SDK
- JWT tokens for webhook verification
- Password hashing for WhatsApp group invites (bcrypt)
- Tenant-scoped data access (RLS policies)

**Data Privacy**:
- GDPR compliance for EU users
- WhatsApp user consent tracking
- Data retention policies
- Right to deletion (GDPR Article 17)

**Rate Limiting**:
- Widget API: 100 requests/min per tenant
- WhatsApp webhook: 1000 messages/hour per tenant
- Chatbot API: 50 requests/min per user

**Input Validation**:
- Sanitize all user inputs
- Validate WhatsApp message payloads
- XSS protection for widget embeds
- SQL injection prevention (parameterized queries)

### 8.2 Compliance Requirements

- **Meta WhatsApp Business Policy**: Follow messaging guidelines
- **GDPR**: User consent, data portability, deletion
- **SOC 2**: Security controls (future)
- **ISO 27001**: Information security (future)

---

## 9. TESTING STRATEGY

### 9.1 Test Coverage

| Test Type | Coverage | Tools |
|-----------|----------|-------|
| **Unit Tests** | ≥80% | Jest, React Testing Library |
| **Integration Tests** | API endpoints, DB queries | Supertest, Postman |
| **E2E Tests** | Critical user flows | Playwright, Cypress |
| **Widget SDK Tests** | All platforms (React, JS, PHP) | Jest, PHPUnit |
| **Load Tests** | 1000 concurrent users | k6, Artillery |
| **Security Tests** | OWASP Top 10 | OWASP ZAP, Burp Suite |

### 9.2 Test Scenarios

**Website Widget**:
- Widget loads on React, Vanilla JS, PHP, WIX
- Contract data fetches correctly
- Analytics events track properly
- Theme customization works
- CORS headers configured

**Chat Bot**:
- Intent recognition accuracy ≥85%
- Context retention across messages
- Fallback to human agent
- Multi-language support (if applicable)
- Document upload and parsing

**WhatsApp Bot**:
- Message delivery confirmation
- Media handling (images, PDFs)
- Template message approval
- BBB intent recognition ("Hi BBB")
- Rate limit handling

**WhatsApp Groups**:
- Password verification
- Member addition/removal
- Group message broadcasting
- Analytics tracking

---

## 10. ROLLOUT STRATEGY

### 10.1 Phased Rollout

**Phase 1: Internal Alpha (Week 1-2)**
- Internal team testing
- Stakeholder demos
- Collect feedback

**Phase 2: Closed Beta (Week 3-6)**
- 5-10 select tenants
- BBB group as pilot
- Early feedback loop

**Phase 3: Open Beta (Week 7-10)**
- All interested tenants (via landing page sign-up)
- Limited free access
- Monitor usage patterns

**Phase 4: General Availability (Week 11+)**
- Full production release
- Pricing model activated
- Marketing campaign

### 10.2 Feature Flags

```typescript
// Feature flag configuration
const CHANNEL_FEATURES = {
  website_integration: {
    enabled: true,
    allowedTenants: ['*'], // All tenants
    pricingTier: 'paid'
  },
  chatbot: {
    enabled: true,
    allowedTenants: ['beta_testers'],
    pricingTier: 'paid'
  },
  whatsapp_bot: {
    enabled: false, // Not ready yet
    allowedTenants: [],
    pricingTier: 'paid'
  },
  whatsapp_groups: {
    enabled: false,
    allowedTenants: ['bbb_members'],
    pricingTier: 'free' // BBB exclusive
  }
};
```

---

## 11. PRICING MODEL (Future)

### 11.1 Proposed Pricing Tiers

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| **Website Widget** | ₹999/month | ₹2,999/month | Custom |
| **Chat Bot** | ₹1,999/month | ₹4,999/month | Custom |
| **WhatsApp Bot** | ₹1,499/month | ₹3,999/month | Custom |
| **WhatsApp Groups** | Free (BBB) | ₹999/month | Custom |
| **Message Limits** | 1,000/month | 10,000/month | Unlimited |
| **Support** | Email | Priority | Dedicated |

### 11.2 Early Access Incentive

- **First 50 tenants**: 50% off for 6 months
- **BBB members**: Lifetime free WhatsApp Groups
- **Beta testers**: 3 months free across all channels

---

## 12. SUCCESS METRICS (KPIs)

### 12.1 Adoption Metrics

- **Interest Expression**: 200+ tenants in first 3 months
- **Activation Rate**: 30% of interested tenants activate at least one channel
- **Retention**: 80% of activated tenants still using after 6 months

### 12.2 Usage Metrics

- **Website Widget**: 10,000+ monthly loads across all tenants
- **Chat Bot**: 5,000+ conversations/month
- **WhatsApp Bot**: 3,000+ messages/month
- **WhatsApp Groups**: 100+ BBB members joined

### 12.3 Revenue Metrics

- **ARR Target**: ₹10 lakhs in first year
- **ARPU**: ₹3,000/tenant/month
- **LTV:CAC Ratio**: >3:1

---

## 13. RISKS & MITIGATION

### 13.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **N8N Server Downtime** | High | Medium | Implement failover, monitoring, alerts |
| **WhatsApp API Changes** | High | Low | Version pinning, changelog monitoring |
| **AI Hallucinations** | Medium | High | Add confidence thresholds, human review fallback |
| **Widget Performance** | Medium | Medium | Lazy loading, CDN optimization, caching |
| **Security Breach** | High | Low | Regular audits, penetration testing, bug bounty |

### 13.2 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Low Adoption** | High | Medium | Strong marketing, clear value prop, free tier |
| **High Support Load** | Medium | High | Comprehensive docs, self-service tools, chatbot |
| **Competitive Pressure** | Medium | Medium | Unique features (BBB model), pricing advantage |
| **Regulatory Changes** | Medium | Low | Legal review, compliance monitoring |

---

## 14. SUPPORT & DOCUMENTATION

### 14.1 Documentation Needs

- **User Guides**: Setup wizards, integration tutorials
- **API Docs**: OpenAPI spec, code examples
- **SDK Docs**: React, JavaScript, PHP, WIX examples
- **Admin Guides**: Configuration, troubleshooting
- **Developer Docs**: Webhook setup, N8N workflows

### 14.2 Support Channels

- **Help Center**: Self-service knowledge base
- **Email Support**: support@contractnest.com
- **Chat Support**: In-app chat (using our own chatbot!)
- **Community Forum**: Peer-to-peer help
- **Video Tutorials**: YouTube channel

---

## 15. NEXT STEPS

### Immediate Actions (Next 2 Weeks)

1. **Approve Impact Analysis** - Stakeholder sign-off
2. **Database Migration** - Create new tables (Phase 1)
3. **Build Landing Pages** - 3 CRO-optimized pages for interest expression
4. **Update VaNi Menu** - Add Channels submenu (Website, WhatsApp, Bot)
5. **Set Up N8N Server** - Dockerize and deploy separate instance
6. **Create API Stubs** - Scaffold new API endpoints

### Medium-Term Actions (Weeks 3-8)

1. **Build Website Widget SDK** - React, JS, PHP, WIX versions
2. **Implement Chat Bot** - AI integration, semantic clustering
3. **Configure WhatsApp Integration** - Meta API, N8N workflows
4. **User Profile Builder** - Onboarding flows

### Long-Term Actions (Weeks 9-16)

1. **WhatsApp Groups** - Password protection, BBB subset
2. **Analytics Dashboards** - Channel-specific insights
3. **Beta Testing** - Closed beta with select tenants
4. **Production Launch** - GA release with pricing

---

## 16. CONCLUSION

The **Channels for Tenants** feature represents a significant expansion of ContractNest's capabilities, transforming it from a contract management platform into a comprehensive customer engagement ecosystem.

**Strategic Benefits**:
- **Revenue Growth**: New paid feature stream
- **Market Differentiation**: Multi-channel strategy
- **Customer Retention**: Increased stickiness through integrations
- **Data Intelligence**: Semantic clustering unlocks AI-driven insights

**Implementation Complexity**: Medium-High
**Timeline**: 16 weeks (4 months)
**Estimated Cost**: ₹15-20 lakhs (development + infrastructure)
**Expected ROI**: 200% in Year 1

**Recommendation**: **PROCEED** with phased rollout starting with landing pages for lead generation, followed by Website Widget SDK as the first production-ready channel.

---

## APPENDIX

### A. Glossary

- **CRO**: Conversion Rate Optimization
- **N8N**: Open-source workflow automation tool
- **Semantic Clustering**: Grouping similar user profiles/intents using AI
- **BBB**: Bagyanagar Business Network (subset group)
- **RLS**: Row Level Security (PostgreSQL security feature)
- **ARPU**: Average Revenue Per User
- **LTV**: Lifetime Value
- **CAC**: Customer Acquisition Cost

### B. References

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [N8N Documentation](https://docs.n8n.io)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

### C. Contact Information

**Project Lead**: [Your Name]
**Technical Lead**: [Technical Lead Name]
**Product Owner**: Charan Kamal B
**Email**: charan@contractnest.com

---

**Document Version**: 1.0
**Last Updated**: November 14, 2025
**Next Review**: December 14, 2025
