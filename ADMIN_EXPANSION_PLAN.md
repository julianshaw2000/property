# Admin Section Expansion Plan

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Detailed Specification](#detailed-specification)
3. [Implementation Plan](#implementation-plan)
4. [Database Changes](#database-changes)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Testing Strategy](#testing-strategy)
8. [Code Examples](#code-examples)

---

## Current State Analysis

### Already Implemented (Phase 1-5)
✅ **Backend**:
- Authorization policies (RequireSuperAdmin, RequireOrgAdmin)
- Multi-tenant query filtering with SuperAdmin bypass
- OrganisationService, UserManagementService, AuditLogService
- API endpoints for basic org/user management
- PrimaryAdminUserId field with validation logic
- Audit logging infrastructure

✅ **Frontend**:
- Role tracking in AuthService
- Role guard for route protection
- Admin layout with sidebar
- Basic components: OrganisationList, UserList, AuditLogList
- CreateUserDialog, CreateOrganisationDialog

### Gaps to Fill
❌ Dashboard with KPIs and metrics
❌ Plans & Billing management
❌ Feature Flags system
❌ Templates & Defaults
❌ Integration management (API keys, webhooks)
❌ Support Tools (impersonation, data export)
❌ Platform Settings
❌ Enhanced organisation detail with tabs
❌ Usage metrics and analytics
❌ Webhook/Job failure monitoring

---

## Detailed Specification

## A) NAVIGATION STRUCTURE

### Super Admin Navigation
```
┌─ Dashboard (Home)
├─ Organisations
│  ├─ All Organisations
│  └─ Create Organisation
├─ Users (Platform-wide)
│  ├─ All Users
│  └─ Super Admins
├─ Plans & Billing
│  ├─ Subscription Plans
│  ├─ Billing Overview
│  └─ Usage Reports
├─ Feature Flags
│  ├─ Global Flags
│  └─ Organisation Overrides
├─ Templates & Defaults
│  ├─ Email Templates
│  ├─ Ticket Templates
│  └─ Default Settings
├─ Integrations
│  ├─ API Keys (Platform)
│  ├─ Webhooks (Platform)
│  └─ Provider Settings (Twilio, SendGrid, etc.)
├─ Audit Logs
│  ├─ Platform Audit
│  └─ Organisation Audit
├─ Support Tools
│  ├─ User Impersonation
│  ├─ Data Export
│  └─ System Health
└─ Platform Settings
   ├─ General
   ├─ Security
   └─ Notifications
```

### Organisation Admin Navigation
```
┌─ Dashboard (Org Home)
├─ Users & Roles
│  ├─ Active Users
│  ├─ Pending Invites
│  └─ Deactivated Users
├─ Organisation Settings
│  ├─ Profile
│  ├─ Branding
│  └─ Preferences
├─ Billing & Plan
│  ├─ Current Plan
│  ├─ Usage
│  └─ Invoices (read-only)
├─ Integrations (Org-level)
│  ├─ API Keys
│  └─ Webhooks
├─ Templates (Org-level)
│  ├─ Email Templates
│  └─ Ticket Templates
└─ Audit Log
   └─ Organisation Activity
```

---

## B) SCREEN-BY-SCREEN REQUIREMENTS

### 1. SUPER ADMIN DASHBOARD

**Route**: `/admin/dashboard`
**Guard**: RequireSuperAdmin
**Layout**: 2-column grid with metric cards + charts

#### Metrics Cards (Top Row)
- **Total Organisations**: Count (Active / Suspended / Trial)
  - Click → Navigate to Organisations list with filter
- **Total Users**: Count across all orgs
  - Click → Navigate to Platform Users
- **Active Tickets**: Last 30 days
  - Click → Navigate to Tickets overview (new screen)
- **System Health**: Green/Yellow/Red indicator
  - Click → Navigate to Support Tools > System Health

#### Charts/Widgets (Second Row)
- **Organisation Growth**: Line chart (last 12 months)
- **User Signups**: Line chart (last 30 days)
- **Revenue**: Bar chart by plan type (if billing implemented)
- **Top Active Organisations**: Table (by ticket volume)

#### Alerts Section (Bottom)
- **Critical Alerts**: Red banner
  - Webhook failures (last 24h)
  - Job failures (last 24h)
  - Provider errors (Twilio, SendGrid)
  - Suspended orgs with open tickets
- **Warnings**: Yellow banner
  - Orgs near plan limits
  - Expiring trials
  - Failed payment attempts

#### Empty States
- No alerts: "All systems operational ✓"
- No organisations: "Create your first organisation to get started"

#### Actions
- "View All Organisations" button
- "View System Health" button
- Refresh button (updates metrics)

---

### 2. ORGANISATIONS LIST (Enhanced)

**Route**: `/admin/organisations`
**Guard**: RequireSuperAdmin
**Layout**: Table with filters + search

#### Filters (Top Bar)
- Status: All / Active / Suspended / Trial / Expired
- Plan: All / Free / Pro / Enterprise
- Created: Last 7 days / Last 30 days / Last 90 days / All time
- Search: Name, Slug, Primary Admin email

#### Table Columns
| Column | Description | Sortable | Actions |
|--------|-------------|----------|---------|
| Name | Organisation name + slug | Yes | Click → Detail |
| Status | Badge (Active/Suspended) | Yes | Inline toggle |
| Plan | Badge with color | Yes | Click → Change plan |
| Primary Admin | Email + name | No | Click → User detail |
| Users | Count | Yes | - |
| Tickets (30d) | Count | Yes | - |
| Last Activity | Timestamp | Yes | - |
| Created | Date | Yes | - |
| Actions | Menu | - | View, Edit, Suspend, Delete |

#### Bulk Actions
- Suspend selected organisations
- Change plan for selected (opens dialog)
- Export selected (CSV)

#### Row Actions Menu
- **View Details**: Navigate to org detail
- **Edit**: Opens edit dialog (name, slug, plan)
- **Suspend/Reactivate**: Confirmation dialog
- **Change Plan**: Opens plan selector dialog
- **Impersonate Admin**: Logs in as Primary Admin (audit logged)
- **Export Data**: Exports org data (audit logged)
- **Delete**: Soft delete (confirmation required, audit logged)

#### Empty States
- No organisations: "No organisations found. Create your first organisation."
- No search results: "No organisations match your filters. Try adjusting your search."

#### Validation
- Cannot suspend org with active tickets (warning dialog)
- Cannot delete org with users (must deactivate users first)

---

### 3. ORGANISATION DETAIL (Tabbed)

**Route**: `/admin/organisations/:id`
**Guard**: RequireSuperAdmin
**Layout**: Tabs with breadcrumb navigation

**Breadcrumb**: Admin > Organisations > [Organisation Name]

#### Tab 1: Overview

**Header Section**:
- Organisation name (editable inline)
- Status badge (Active/Suspended toggle)
- Plan badge (click to change)
- Created date
- Actions: Edit, Suspend, Delete

**Metadata Card**:
- **Slug**: `organisation-slug` (editable)
- **Primary Admin**: user@example.com (click to change)
- **Created**: Jan 1, 2025
- **Last Activity**: 2 hours ago
- **Timezone**: Europe/London (editable)
- **Locale**: en-GB (editable)

**Usage Metrics Card** (Last 30 Days):
- Total Users: 15
- Active Users: 12
- Total Tickets: 234
- Open Tickets: 12
- Work Orders: 45
- Invoices: 23

**Plan Details Card**:
- Current Plan: Pro
- Billing Cycle: Monthly
- Next Renewal: Feb 1, 2025
- Price: £99/month
- Actions: Change Plan, View Invoices

**Feature Flags Card**:
- List of enabled/disabled features
- Toggle switches (org-level overrides)
- Inherited from plan: Gray toggle (disabled)
- Overridden: Blue toggle (enabled)

#### Tab 2: Users & Admins

**Layout**: Table similar to UserList but org-scoped

**Filters**:
- Role: All / OrgAdmin / Coordinator / Viewer / Contractor / Tenant
- Status: All / Active / Inactive / Pending Invite

**Table Columns**:
| Column | Description | Actions |
|--------|-------------|---------|
| Email | User email | Click → User detail |
| Name | First + Last | - |
| Role | Dropdown (inline edit) | - |
| Status | Badge | - |
| Primary Admin | Star icon | Click to set |
| Last Login | Timestamp | - |
| Actions | Menu | Edit, Deactivate, Remove |

**Actions**:
- Create User
- Invite User
- Assign Primary Admin
- Bulk deactivate

**Validation**:
- Cannot remove last OrgAdmin
- Cannot remove Primary Admin without reassigning

#### Tab 3: Billing & Plan

**Current Plan Card**:
- Plan name, price, billing cycle
- Included features list
- Usage vs. limits progress bars
- Actions: Upgrade, Downgrade, Cancel

**Usage Card**:
- Users: 15 / 50 (30%)
- Tickets: 234 / 1000 (23%)
- Storage: 2.3 GB / 10 GB (23%)
- API Calls: 45K / 100K (45%)

**Invoices Table**:
| Date | Amount | Status | Actions |
|------|--------|--------|---------|
| Jan 1, 2025 | £99 | Paid | View, Download |
| Dec 1, 2024 | £99 | Paid | View, Download |

**Payment Method Card**:
- Card ending in 1234
- Expires: 12/26
- Actions: Update, Remove

#### Tab 4: Feature Flags

**Table**:
| Flag | Description | Plan Default | Org Override | Actions |
|------|-------------|--------------|--------------|---------|
| ai_triage | AI-powered ticket triage | Enabled (Pro) | - | Toggle |
| sms_notifications | SMS alerts via Twilio | Enabled (Pro) | Disabled | Toggle |
| custom_branding | Custom logo/colors | Disabled (Free) | Enabled | Toggle |

**Actions**:
- Toggle org-level override
- Reset to plan default
- Bulk enable/disable

#### Tab 5: Integrations

**API Keys Section**:
- List of API keys (masked)
- Created date, last used
- Actions: Regenerate, Revoke

**Webhooks Section**:
- Webhook URL
- Events subscribed
- Status (Active/Failing)
- Last delivery timestamp
- Actions: Test, Edit, Delete

**Provider Settings**:
- Twilio (SMS)
- SendGrid (Email)
- WhatsApp Business
- Status indicators
- Actions: Configure, Test

#### Tab 6: Audit Log

**Filters**:
- Action Type: All / User / Organisation / Billing / Integration
- User: All / Select user
- Date Range: Last 7 days / Last 30 days / Custom

**Table**:
| Timestamp | User | Action | Entity | Changes | IP Address |
|-----------|------|--------|--------|---------|------------|
| 2h ago | admin@org.com | user.role_changed | John Doe | Viewer → Coordinator | 192.168.1.1 |

**Actions**:
- Export (CSV)
- View details (expandable JSON)

---

### 4. PLANS & BILLING (Super Admin)

**Route**: `/admin/plans`
**Guard**: RequireSuperAdmin
**Layout**: Cards + Table

#### Plans Overview Cards
- **Free**: 5 orgs (12%), £0 MRR
- **Pro**: 15 orgs (35%), £1,485 MRR
- **Enterprise**: 3 orgs (7%), £1,200 MRR

#### Plans Table
| Plan | Price | Features | Organisations | MRR | Actions |
|------|-------|----------|---------------|-----|---------|
| Free | £0 | 5 users, 50 tickets/mo | 12 | £0 | Edit |
| Pro | £99/mo | 50 users, 1000 tickets/mo | 35 | £3,465 | Edit |
| Enterprise | £399/mo | Unlimited | 7 | £2,793 | Edit |

**Actions**:
- Create Plan
- Edit Plan (features, pricing)
- Archive Plan (cannot delete if orgs using it)

#### Plan Editor (Dialog)
- Name, Description
- Price (monthly/annual)
- Features checklist
- Limits (users, tickets, storage, API calls)
- Feature flags (default enabled/disabled)

---

### 5. FEATURE FLAGS (Super Admin)

**Route**: `/admin/feature-flags`
**Guard**: RequireSuperAdmin
**Layout**: Table with toggle switches

#### Filters
- Status: All / Enabled / Disabled
- Scope: Global / Plan-based / Org-override

#### Table
| Flag Key | Description | Global Default | Pro Default | Enterprise Default | Overrides | Actions |
|----------|-------------|----------------|-------------|-------------------|-----------|---------|
| ai_triage | AI ticket triage | ❌ | ✅ | ✅ | 3 orgs | Edit, View |
| sms_notifications | SMS alerts | ❌ | ✅ | ✅ | 1 org | Edit, View |
| custom_branding | Custom branding | ❌ | ❌ | ✅ | 5 orgs | Edit, View |

**Actions**:
- Create Flag
- Edit Flag
- Delete Flag (confirmation, check no overrides)
- View Overrides (opens modal with list of orgs)

#### Flag Editor (Dialog)
- Key (snake_case, immutable after creation)
- Name (display name)
- Description
- Type: Boolean / String / Number / JSON
- Default value
- Plan defaults (Free, Pro, Enterprise)

---

### 6. INTEGRATIONS (Super Admin)

**Route**: `/admin/integrations`
**Guard**: RequireSuperAdmin
**Layout**: Cards for each integration

#### Integration Cards

**Twilio (SMS)**:
- Status: ✅ Connected
- Account SID: `AC1234...` (masked)
- Phone Number: +44 7700 900123
- Last Used: 2 hours ago
- Usage (30d): 1,234 SMS sent
- Actions: Configure, Test, Disconnect

**SendGrid (Email)**:
- Status: ✅ Connected
- API Key: `SG.12345...` (masked)
- Verified Domain: maintainuk.com
- Last Used: 5 minutes ago
- Usage (30d): 45,678 emails sent
- Actions: Configure, Test, Disconnect

**AWS S3 (Storage)**:
- Status: ✅ Connected
- Bucket: maintainuk-production
- Region: eu-west-2
- Usage: 234 GB
- Actions: Configure, Test, Disconnect

**Stripe (Payments)**:
- Status: ⚠️ Not Connected
- Actions: Connect

#### Configuration Dialog
- API credentials (secure input)
- Test connection button
- Webhook URL (read-only, copy button)
- Events to subscribe

---

### 7. SUPPORT TOOLS (Super Admin)

**Route**: `/admin/support`
**Guard**: RequireSuperAdmin
**Layout**: Tool cards

#### User Impersonation
- Search user by email
- "Impersonate" button
- Warning: "All actions will be audit logged"
- Session expires after 1 hour
- "Exit Impersonation" banner when active

#### Data Export
- Select organisation
- Select data type: Users, Tickets, Work Orders, Invoices, All
- Date range
- Format: CSV, JSON
- "Export" button (queues background job)
- Downloads list (with status: Pending, Ready, Expired)

#### System Health
- **Database**: ✅ Healthy (23ms avg query time)
- **Redis**: ✅ Healthy (2ms avg)
- **Storage**: ✅ Healthy (234 GB used / 1 TB)
- **Jobs Queue**: ⚠️ 12 failed jobs (last 24h)
- **Webhooks**: ❌ 5 failing webhooks
- **API**: ✅ Healthy (avg 145ms response time)

Actions: View failed jobs, Retry failed jobs, View failing webhooks

#### Cache Management
- Clear all cache
- Clear organisation cache (select org)
- Clear user session cache

---

### 8. PLATFORM SETTINGS (Super Admin)

**Route**: `/admin/settings`
**Guard**: RequireSuperAdmin
**Layout**: Tabs

#### General Tab
- Platform Name: MaintainUK
- Support Email: support@maintainuk.com
- Logo Upload
- Favicon Upload
- Default Timezone: Europe/London
- Default Locale: en-GB

#### Security Tab
- **Password Policy**:
  - Minimum length: 8 characters
  - Require uppercase: ✅
  - Require numbers: ✅
  - Require special chars: ✅
  - Password expiry: 90 days (0 = never)
- **Session Settings**:
  - Session timeout: 30 minutes
  - Max concurrent sessions: 3
  - Remember me duration: 30 days
- **MFA Settings**:
  - Enforce MFA for SuperAdmins: ✅
  - Enforce MFA for OrgAdmins: ❌
  - Allow SMS MFA: ✅
  - Allow TOTP MFA: ✅

#### Notifications Tab
- Email notifications for:
  - New organisation created: ✅
  - Organisation suspended: ✅
  - Payment failed: ✅
  - Webhook failed: ✅
  - Job failed: ✅
- Notification recipients (email list)
- Slack webhook URL (optional)

---

### 9. ORGANISATION ADMIN DASHBOARD

**Route**: `/admin/org-dashboard`
**Guard**: RequireOrgAdmin
**Layout**: Org-scoped metrics

#### Metrics Cards
- **Total Users**: 15 (Active: 12, Pending: 2, Inactive: 1)
- **Open Tickets**: 23
- **This Month**: 145 tickets, 67 work orders
- **Plan Usage**: 30% of limits

#### Charts
- **Ticket Volume**: Last 30 days line chart
- **Users by Role**: Pie chart
- **Response Times**: Bar chart (by assignee)

#### Recent Activity Table
- Last 10 user actions (logins, role changes, invites)
- Quick actions: View all, Export

---

### 10. USERS & ROLES (Organisation Admin)

**Route**: `/admin/users`
**Guard**: RequireOrgAdmin
**Layout**: Enhanced version of current UserList

#### Tabs
- Active Users
- Pending Invites
- Deactivated Users

#### Active Users Tab
**Filters**:
- Role: All / OrgAdmin / Coordinator / Viewer / Contractor / Tenant
- Search: Name, Email

**Table**:
| Email | Name | Role | Last Login | Primary Admin | Actions |
|-------|------|------|------------|---------------|---------|
| john@org.com | John Doe | OrgAdmin | 2h ago | ⭐ | Edit, Deactivate |
| jane@org.com | Jane Smith | Coordinator | 1d ago | - | Edit, Set Primary, Deactivate |

**Actions**:
- Invite User (opens dialog)
- Create User (opens dialog)
- Set Primary Admin
- Bulk actions: Change role, Deactivate

**Validation**:
- Cannot deactivate Primary Admin
- Cannot remove last OrgAdmin
- Cannot change role to SuperAdmin

#### Pending Invites Tab
**Table**:
| Email | Role | Invited By | Invited Date | Actions |
|-------|------|------------|--------------|---------|
| new@org.com | Viewer | john@org.com | 1d ago | Resend, Cancel |

**Actions**:
- Resend invite
- Cancel invite (soft delete)

#### Deactivated Users Tab
**Table**:
| Email | Name | Role | Deactivated Date | Deactivated By | Actions |
|-------|------|------|------------------|----------------|---------|
| old@org.com | Old User | Viewer | 30d ago | john@org.com | Reactivate |

**Actions**:
- Reactivate user
- Permanently delete (confirmation, audit logged)

---

### 11. ORGANISATION SETTINGS (Organisation Admin)

**Route**: `/admin/org-settings`
**Guard**: RequireOrgAdmin
**Layout**: Tabs (read-only for most, except Preferences)

#### Profile Tab (Read-only)
- Organisation Name
- Slug
- Primary Admin
- Created Date
- Message: "Contact support to change these settings"

#### Branding Tab
- Logo Upload (150x150px, PNG/JPG)
- Primary Color (color picker)
- Email Footer Text
- Preview button

#### Preferences Tab
- Default Timezone
- Default Locale
- Date Format
- Time Format
- Email Notifications: Weekly summary, Daily digest

---

### 12. BILLING & PLAN (Organisation Admin)

**Route**: `/admin/billing`
**Guard**: RequireOrgAdmin
**Layout**: Read-only view

#### Current Plan Card
- Plan Name: Pro
- Price: £99/month
- Billing Cycle: Monthly
- Next Renewal: Feb 1, 2025
- Actions: Request Upgrade (opens mailto to sales@maintainuk.com)

#### Usage Card
- Users: 15 / 50 (30%) - progress bar
- Tickets: 234 / 1000 (23%) - progress bar
- Storage: 2.3 GB / 10 GB (23%) - progress bar
- API Calls: 45K / 100K (45%) - progress bar
- Warning if >80%: "You're approaching your plan limit"

#### Invoices Table (Read-only)
| Date | Amount | Status | Actions |
|------|--------|--------|---------|
| Jan 1, 2025 | £99 | Paid | Download PDF |

---

### 13. AUDIT LOG (Organisation Admin)

**Route**: `/admin/audit`
**Guard**: RequireOrgAdmin
**Layout**: Org-scoped version of platform audit

**Filters**:
- Action Type: All / User / Ticket / Work Order / Invoice
- User: All / Select user
- Date Range: Last 7 days / Last 30 days / Custom

**Table**: Same as SuperAdmin audit but org-scoped

---

## C) PERMISSIONS MATRIX

| Action | SuperAdmin | OrgAdmin | Primary Admin | Notes |
|--------|-----------|----------|---------------|-------|
| **Organisations** |
| View all orgs | ✅ | ❌ | ❌ | |
| View own org | ✅ | ✅ | ✅ | Read-only for OrgAdmin |
| Create org | ✅ | ❌ | ❌ | |
| Edit org | ✅ | ❌ | ❌ | Name, slug, timezone |
| Suspend org | ✅ | ❌ | ❌ | Audit logged |
| Delete org | ✅ | ❌ | ❌ | Soft delete, audit logged |
| Change plan | ✅ | ❌ | ❌ | |
| **Users** |
| View all users (platform) | ✅ | ❌ | ❌ | |
| View org users | ✅ | ✅ | ✅ | Org-scoped |
| Create user | ✅ | ✅ | ✅ | OrgAdmin: own org only |
| Invite user | ✅ | ✅ | ✅ | OrgAdmin: own org only |
| Edit user role | ✅ | ✅ | ❌ | Cannot promote to SuperAdmin |
| Deactivate user | ✅ | ✅ | ❌ | Cannot deactivate Primary Admin |
| Set Primary Admin | ✅ | ✅ | ❌ | OrgAdmin: own org only |
| Delete user | ✅ | ❌ | ❌ | Soft delete |
| **Plans & Billing** |
| View all plans | ✅ | ❌ | ❌ | |
| Create/edit plans | ✅ | ❌ | ❌ | |
| View own org plan | ✅ | ✅ (read-only) | ✅ (read-only) | |
| View invoices | ✅ | ✅ (own org) | ✅ (own org) | |
| **Feature Flags** |
| View all flags | ✅ | ❌ | ❌ | |
| Create/edit flags | ✅ | ❌ | ❌ | |
| Toggle org override | ✅ | ❌ | ❌ | |
| **Integrations** |
| Platform integrations | ✅ | ❌ | ❌ | Twilio, SendGrid, S3 |
| Org API keys | ✅ | ✅ | ✅ | Org-scoped |
| Org webhooks | ✅ | ✅ | ✅ | Org-scoped |
| **Audit Logs** |
| View platform audit | ✅ | ❌ | ❌ | All orgs |
| View org audit | ✅ | ✅ | ✅ | Org-scoped |
| Export audit logs | ✅ | ✅ | ❌ | |
| **Support Tools** |
| User impersonation | ✅ | ❌ | ❌ | Audit logged |
| Data export | ✅ | ✅ (own org) | ❌ | Audit logged |
| System health | ✅ | ❌ | ❌ | |
| Cache management | ✅ | ❌ | ❌ | |
| **Settings** |
| Platform settings | ✅ | ❌ | ❌ | |
| Org branding | ✅ | ✅ | ❌ | |
| Org preferences | ✅ | ✅ | ✅ | |

---

## D) AUDIT LOG EVENTS

### Organisation Events
| Event | Metadata | Performed By |
|-------|----------|--------------|
| `organisation.created` | name, slug, plan | SuperAdmin |
| `organisation.updated` | old_name, new_name, old_slug, new_slug | SuperAdmin |
| `organisation.suspended` | reason | SuperAdmin |
| `organisation.reactivated` | - | SuperAdmin |
| `organisation.deleted` | soft_delete: true | SuperAdmin |
| `organisation.plan_changed` | old_plan, new_plan | SuperAdmin |
| `organisation.primary_admin_changed` | old_admin_id, new_admin_id | SuperAdmin, OrgAdmin |

### User Events
| Event | Metadata | Performed By |
|-------|----------|--------------|
| `user.created` | email, role, org_id | SuperAdmin, OrgAdmin |
| `user.invited` | email, role, org_id, invite_token | SuperAdmin, OrgAdmin |
| `user.role_changed` | old_role, new_role | SuperAdmin, OrgAdmin |
| `user.deactivated` | email, role | SuperAdmin, OrgAdmin |
| `user.reactivated` | email, role | SuperAdmin, OrgAdmin |
| `user.deleted` | email, soft_delete: true | SuperAdmin |
| `user.impersonated` | target_user_id, target_user_email | SuperAdmin |

### Plan & Billing Events
| Event | Metadata | Performed By |
|-------|----------|--------------|
| `plan.created` | name, price, features | SuperAdmin |
| `plan.updated` | old_price, new_price, features_changed | SuperAdmin |
| `plan.archived` | name | SuperAdmin |
| `billing.payment_succeeded` | amount, invoice_id, org_id | System |
| `billing.payment_failed` | amount, reason, org_id | System |

### Feature Flag Events
| Event | Metadata | Performed By |
|-------|----------|--------------|
| `feature_flag.created` | key, default_value | SuperAdmin |
| `feature_flag.updated` | key, old_default, new_default | SuperAdmin |
| `feature_flag.deleted` | key | SuperAdmin |
| `feature_flag.override_set` | key, org_id, value | SuperAdmin |
| `feature_flag.override_removed` | key, org_id | SuperAdmin |

### Integration Events
| Event | Metadata | Performed By |
|-------|----------|--------------|
| `integration.connected` | type (twilio, sendgrid, s3) | SuperAdmin |
| `integration.disconnected` | type | SuperAdmin |
| `integration.configured` | type, settings_changed | SuperAdmin |
| `api_key.created` | key_id (masked), org_id | SuperAdmin, OrgAdmin |
| `api_key.revoked` | key_id (masked), org_id | SuperAdmin, OrgAdmin |
| `webhook.created` | url, events, org_id | SuperAdmin, OrgAdmin |
| `webhook.deleted` | url, org_id | SuperAdmin, OrgAdmin |

### Support Tool Events
| Event | Metadata | Performed By |
|-------|----------|--------------|
| `support.data_exported` | org_id, data_type, format | SuperAdmin, OrgAdmin |
| `support.cache_cleared` | cache_type, org_id (if scoped) | SuperAdmin |
| `support.impersonation_started` | target_user_id | SuperAdmin |
| `support.impersonation_ended` | target_user_id, duration_minutes | SuperAdmin |

### Platform Settings Events
| Event | Metadata | Performed By |
|-------|----------|--------------|
| `settings.updated` | section, fields_changed | SuperAdmin |
| `settings.security_changed` | policy_changed | SuperAdmin |

---

## E) UI/UX DESIGN RULES

### Design System (Match Existing)
Based on current implementation:
- **Framework**: Angular Material Design
- **Theme**: Custom with primary/accent/warn colors
- **Typography**: Roboto font family
- **Spacing**: 8px grid system (8, 16, 24, 32, 48px)
- **Cards**: mat-card with elevation-2
- **Tables**: mat-table with hover states
- **Forms**: mat-form-field with outline appearance
- **Buttons**: mat-raised-button (primary), mat-stroked-button (secondary), mat-icon-button (actions)
- **Icons**: Material Icons
- **Chips**: mat-chip for badges and status indicators

### Layout Patterns
```
┌─────────────────────────────────────────────────┐
│ Top Bar (AppComponent - existing)              │
│ [Logo] [Nav] [Search] [Notifications] [User]   │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│  Sidebar │  Content Area                        │
│          │  ┌────────────────────────────────┐  │
│  Nav     │  │ Page Header                    │  │
│  Items   │  │ [Title] [Breadcrumb] [Actions] │  │
│          │  ├────────────────────────────────┤  │
│          │  │                                │  │
│          │  │ Filters / Search               │  │
│          │  │                                │  │
│          │  ├────────────────────────────────┤  │
│          │  │                                │  │
│          │  │ Main Content                   │  │
│          │  │ (Table / Cards / Charts)       │  │
│          │  │                                │  │
│          │  │                                │  │
│          │  └────────────────────────────────┘  │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

### Component Patterns

#### Metric Card
```html
<mat-card class="metric-card">
  <mat-card-content>
    <div class="metric-icon">
      <mat-icon>business</mat-icon>
    </div>
    <div class="metric-value">42</div>
    <div class="metric-label">Total Organisations</div>
    <div class="metric-change positive">+5 this month</div>
  </mat-card-content>
</mat-card>
```

#### Status Badge
```html
<mat-chip [color]="getStatusColor(status)">
  <mat-icon>{{getStatusIcon(status)}}</mat-icon>
  {{status}}
</mat-chip>
```

#### Action Menu
```html
<button mat-icon-button [matMenuTriggerFor]="menu">
  <mat-icon>more_vert</mat-icon>
</button>
<mat-menu #menu="matMenu">
  <button mat-menu-item (click)="view()">
    <mat-icon>visibility</mat-icon>
    <span>View Details</span>
  </button>
  <button mat-menu-item (click)="edit()">
    <mat-icon>edit</mat-icon>
    <span>Edit</span>
  </button>
  <mat-divider></mat-divider>
  <button mat-menu-item (click)="delete()" class="danger">
    <mat-icon>delete</mat-icon>
    <span>Delete</span>
  </button>
</mat-menu>
```

#### Table with Inline Actions
```html
<table mat-table [dataSource]="dataSource">
  <!-- Columns -->
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
    <td mat-cell *matCellDef="let row">{{row.name}}</td>
  </ng-container>

  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef>Actions</th>
    <td mat-cell *matCellDef="let row">
      <button mat-icon-button (click)="edit(row)">
        <mat-icon>edit</mat-icon>
      </button>
      <button mat-icon-button (click)="delete(row)" color="warn">
        <mat-icon>delete</mat-icon>
      </button>
    </td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
  <tr mat-row *matRowDef="let row; columns: displayedColumns;"
      [class.clickable-row]="true"
      (click)="viewDetail(row)"></tr>
</table>
```

#### Empty State
```html
<div class="empty-state">
  <mat-icon class="empty-icon">{{icon}}</mat-icon>
  <h3>{{title}}</h3>
  <p>{{description}}</p>
  <button mat-raised-button color="primary" (click)="action()">
    {{actionLabel}}
  </button>
</div>
```

#### Confirmation Dialog
```html
<h2 mat-dialog-title>Confirm Action</h2>
<mat-dialog-content>
  <p>{{message}}</p>
  @if (warning) {
    <mat-error>⚠️ {{warning}}</mat-error>
  }
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button mat-dialog-close>Cancel</button>
  <button mat-raised-button color="warn" [mat-dialog-close]="true">
    Confirm
  </button>
</mat-dialog-actions>
```

### Color Palette
```typescript
// Status Colors
status = {
  active: '#4caf50',    // Green
  suspended: '#f44336', // Red
  trial: '#ff9800',     // Orange
  expired: '#9e9e9e'    // Gray
};

// Plan Colors
plan = {
  free: '#9e9e9e',      // Gray
  pro: '#2196f3',       // Blue
  enterprise: '#673ab7' // Purple
};

// Alert Colors
alert = {
  success: '#4caf50',   // Green
  warning: '#ff9800',   // Orange
  error: '#f44336',     // Red
  info: '#2196f3'       // Blue
};
```

### Responsive Breakpoints
```scss
// Match Angular Material breakpoints
$breakpoint-xs: 599px;
$breakpoint-sm: 959px;
$breakpoint-md: 1279px;
$breakpoint-lg: 1919px;

// Responsive patterns
@media (max-width: $breakpoint-sm) {
  // Stack cards vertically
  // Hide sidebar
  // Simplify tables (show only essential columns)
}
```

### Animation & Transitions
```scss
// Match existing transitions
transition: all 0.3s ease-in-out;

// Loading state
.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

// Hover states
.clickable-row:hover {
  background-color: rgba(0, 0, 0, 0.04);
  cursor: pointer;
}
```

---

