# MaintainUK: Product Roadmap

## Overview

This roadmap outlines the development phases, feature delivery timeline, and future enhancements for MaintainUK.

## Phase Timeline

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Phase 0 | 1-2 days | Day 1 | Day 2 | ✅ In Progress |
| Phase 1 | 2-3 days | Day 3 | Day 5 | ⏳ Pending |
| Phase 2 | 3-4 days | Day 6 | Day 9 | ⏳ Pending |
| Phase 3 | 3-4 days | Day 10 | Day 13 | ⏳ Pending |
| Phase 4 | 5-7 days | Day 14 | Day 20 | ⏳ Pending |
| Phase 5 | 4-5 days | Day 21 | Day 25 | ⏳ Pending |
| Phase 6 | 7-10 days | Day 26 | Day 35 | ⏳ Pending |
| Phase 7 | 4-5 days | Day 36 | Day 40 | ⏳ Pending |
| Phase 8 | 5-6 days | Day 41 | Day 46 | ⏳ Pending |
| Phase 9 | 5-7 days | Day 47 | Day 53 | ⏳ Pending |
| **Total** | **40-57 days** | Day 1 | Day 53 | ⏳ Pending |

## Version 1.0 (MVP+) - Q1 2026

### Core Features

#### ✅ Multi-Tenancy & Auth
- Organisation management
- User roles and permissions (RBAC)
- JWT authentication
- Password reset
- Multi-tenant data isolation

#### ✅ Property Management
- Properties and units
- Tenancy tracking
- Owner/tenant contact management
- Property hierarchy (property → unit → tenancy)

#### ✅ Maintenance Workflow
- Ticket creation and management
- Work order assignment
- Quote submission and approval
- Invoice management
- Payment tracking
- Timeline events and audit trail

#### ✅ Portals
- **Staff Portal**: Full ticket/property/contractor management
- **Contractor Portal**: View assigned jobs, submit quotes/invoices
- **Tenant Portal**: Report issues, view ticket status, message staff

#### ✅ Messaging
- Multi-channel: Portal, Email, SMS (opt-in), WhatsApp (opt-in)
- Conversation threads per ticket
- Draft → Send workflow (human-in-loop)
- Consent management

#### ✅ Notifications
- In-app notifications
- Email notifications
- SMS notifications (feature-flagged)
- WhatsApp notifications (feature-flagged)

#### ✅ Compliance Tracking
- Gas Safety Certificate (annual)
- Energy Performance Certificate (10 years)
- Electrical Installation Condition Report (5 years)
- Smoke and CO alarms
- Legionella risk assessment (2 years)
- Reminder notifications (30, 14, 7 days before due)

#### ✅ AI Capabilities
- **Staff AI**: Ticket triage, timeline summarisation, message drafting, contractor suggestions, duplicate detection, risk prediction, invoice extraction, compliance explanations, reporting insights
- **Tenant Portal AI**: Guided issue reporting, status explanations, message assistance
- **Contractor Portal AI**: Job summaries, quote structure assistance, completion checklists
- **Comms AI**: Channel-aware drafts, inbound message summarisation, next action suggestions

#### ✅ Background Jobs (BullMQ)
- Outbox pattern (source of truth)
- Email sending
- SMS/WhatsApp sending
- AI job processing
- Compliance reminders (daily sweep)
- SLA escalation (every 5 min)
- Digest generation (daily/weekly)
- Dead letter queue reprocessing (hourly)

#### ✅ SaaS Billing (Stripe)
- Subscription plans (Free, Starter, Professional, Enterprise)
- Usage metering (SMS, WhatsApp, AI jobs)
- Overage billing
- Invoice management via Stripe
- Webhook sync

#### ✅ Security & Hardening
- Rate limiting
- Security headers (HSTS, CSP, X-Frame-Options)
- Encryption at rest (sensitive fields)
- TLS 1.3 in transit
- GDPR compliance (data export, erasure, portability)
- Audit logging (7-year retention)
- AI safety guardrails (human-in-loop, schema validation, redaction)

#### ✅ DevOps
- Docker Compose (local dev)
- CI/CD pipeline (GitHub Actions)
- Kubernetes manifests (production)
- Automated database migrations
- Health checks and monitoring hooks
- Backup and restore procedures

---

## Version 1.1 - Q2 2026

### Enhancements

#### 📊 Advanced Reporting
- **Dashboard**: Key metrics (tickets by status, SLA compliance, spend by category)
- **Custom Reports**: Filter by date range, property, contractor
- **Export**: CSV, PDF
- **Scheduled Reports**: Weekly/monthly email digest

#### 📱 Mobile Optimization
- **PWA**: Progressive Web App with offline support
- **Install Prompt**: Add to home screen (iOS/Android)
- **Push Notifications**: Native mobile notifications
- **Offline Mode**: View cached tickets, draft messages offline

#### 🔔 Advanced Notifications
- **Notification Rules**: Org-level configuration (which events trigger which channels)
- **Quiet Hours**: Don't send SMS/WhatsApp outside 8am-8pm
- **Escalation**: Auto-escalate if no response within X hours
- **Digest Mode**: Batch notifications into daily digest

#### 🏗️ Recurring Maintenance
- **Preventive Maintenance**: Schedule recurring inspections (boiler service, gutter cleaning)
- **Automatic Ticket Creation**: Generate tickets on schedule
- **Contractor Pre-Assignment**: Assign preferred contractor automatically

---

## Version 1.2 - Q3 2026

### Integrations

#### 📧 Enhanced Email
- **Rich Templates**: HTML email builder
- **Branding**: Org-specific logos and colors
- **Attachments**: Send documents via email

#### 📞 Voice Integration (Twilio)
- **Click-to-Call**: Staff can call contractors/tenants from portal
- **Call Logging**: Record call duration and notes
- **Voicemail Transcription**: AI transcribes voicemails → timeline events

#### 💳 Payment Processing (Stripe)
- **Contractor Payments**: Pay invoices via Stripe (ACH/BACS)
- **Autopay**: Auto-pay approved invoices under threshold
- **Payment Status**: Track pending/completed payments

#### 🔗 Accounting Integration (Phase 1)
- **Xero**: Export invoices and payments
- **QuickBooks**: Export invoices and payments

---

## Version 2.0 - Q4 2026

### Advanced Features

#### 🤖 AI Enhancements
- **Predictive Maintenance**: ML model predicts appliance failures
- **Cost Estimation**: AI estimates repair costs before contractor quote
- **Tenant Sentiment Analysis**: Analyze message tone, flag unhappy tenants
- **Contractor Ranking**: ML-based contractor performance scoring

#### 📸 Visual Inspection
- **Photo Analysis**: AI detects issue severity from photos
- **Before/After Comparison**: Auto-generate comparison reports
- **Damage Assessment**: Estimate repair scope from images

#### 🗺️ Geographic Features
- **Map View**: Properties on interactive map
- **Contractor Proximity**: Sort contractors by distance to property
- **Multi-Property Jobs**: Batch jobs across nearby properties

#### 👥 Team Collaboration
- **Internal Notes**: Private staff notes on tickets
- **@Mentions**: Notify specific team members
- **Task Assignment**: Assign internal tasks (e.g., "Review quote")

#### 📄 Document Management
- **Lease Storage**: Store tenant leases
- **Certificate Archive**: Compliance certificates organized by property
- **OCR Search**: Search within PDF/image documents

---

## Version 3.0 - 2027

### Platform Features

#### 🏢 Enterprise Features
- **Multi-Org Support**: SuperAdmin can manage multiple organisations
- **White-Label**: Custom branding per org
- **API Access**: Public API for third-party integrations
- **Webhooks**: Real-time event notifications to external systems

#### 🔐 Advanced Security
- **Multi-Factor Authentication (MFA)**: TOTP, SMS backup codes
- **SSO (Single Sign-On)**: SAML, OAuth 2.0 for enterprise customers
- **IP Whitelisting**: Restrict access to specific IP ranges
- **Audit Log Export**: Download full audit history

#### 📊 Business Intelligence
- **Custom Dashboards**: Drag-and-drop dashboard builder
- **SQL Query Builder**: Power users can create custom reports
- **Data Export API**: Bulk data export for analytics

#### 🌍 Internationalization
- **Multi-Currency**: Support EUR, USD (UK-only for v1)
- **Multi-Language**: French, German, Spanish (English-only for v1)
- **Localization**: Date/time formats, address formats

---

## Out of Scope (Not Planned)

❌ **Rent Collection**: Use dedicated platforms (Rentify, Goodlord)
❌ **Tenant Screening**: Use dedicated platforms (Experian, Homelet)
❌ **Lease Management**: Complex lease clauses, renewals (future consideration)
❌ **Property Marketing**: Listings, viewings (use Rightmove, Zoopla)
❌ **Key Management**: Smart locks, key tracking (future consideration)
❌ **IoT Sensors**: Temperature, humidity, leak detection (future consideration)

---

## Success Metrics

### v1.0 Launch Criteria

- [ ] 10 beta customers signed up
- [ ] 50+ properties under management
- [ ] 200+ tickets processed end-to-end
- [ ] 10+ contractors onboarded
- [ ] 100+ messages sent (all channels)
- [ ] 50+ AI jobs processed successfully
- [ ] 99% uptime over 30 days
- [ ] <500ms p95 API response time
- [ ] Zero critical security issues
- [ ] GDPR compliance verified
- [ ] Accessibility WCAG AA validated

### v1.1 Success Metrics

- [ ] 50 paying customers
- [ ] 500+ properties under management
- [ ] 2,000+ tickets processed
- [ ] 10,000+ messages sent
- [ ] 1,000+ AI jobs processed
- [ ] 95%+ customer satisfaction (NPS >40)
- [ ] <2% churn rate

### v2.0 Success Metrics

- [ ] 200 paying customers
- [ ] 5,000+ properties under management
- [ ] 50,000+ tickets processed
- [ ] Revenue: £50k MRR
- [ ] Team: 5 engineers, 2 support staff

---

## Feature Requests

Customer-requested features are tracked in GitHub Issues with `feature-request` label.

**Voting**: Customers can upvote features (weighted by plan tier)

**Review Cycle**: Quarterly roadmap review

---

## Release Schedule

**Cadence**: Bi-weekly releases (every other Thursday)

**Process**:
1. Code freeze: Tuesday 5pm
2. Deploy to staging: Wednesday 9am
3. QA testing: Wednesday-Thursday morning
4. Deploy to production: Thursday 2pm
5. Monitor: Thursday afternoon
6. Hotfix if needed: Friday

**Communication**:
- Release notes published in-app
- Email notification to admins
- Changelog: `/changelog`

---

**Last Updated**: 2025-12-31
**Roadmap Owner**: Product Manager (pm@maintainuk.com)
**Review Schedule**: Monthly

