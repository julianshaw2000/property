# MaintainUK: UK Compliance Guide

## Overview

MaintainUK must comply with UK laws governing property management, data protection, accessibility, and tenant rights.

## Data Protection

### GDPR & UK Data Protection Act 2018

**Data Controller**: MaintainUK Ltd
**DPO Contact**: dpo@maintainuk.com
**ICO Registration**: Required

**Lawful Basis for Processing**:
- **Contract Performance**: Processing tenant/landlord data for service delivery
- **Legitimate Interest**: Fraud prevention, security
- **Consent**: Marketing communications (SMS/WhatsApp/email)

**Data Subject Rights**:
1. **Right to Access**: Export all personal data (JSON format)
   - Endpoint: `GET /api/v1/users/me/data-export`
   - Response time: Within 30 days

2. **Right to Rectification**: Update personal information
   - Endpoint: `PATCH /api/v1/users/me`

3. **Right to Erasure** ("Right to be Forgotten"):
   - Soft delete immediately
   - Hard delete after 90 days (or immediately on explicit request)
   - Exceptions: Legal/accounting obligations (7-year retention)
   - Endpoint: `DELETE /api/v1/users/me`

4. **Right to Data Portability**: Machine-readable format (JSON)

5. **Right to Object**: Opt-out of marketing
   - Endpoint: `POST /api/v1/consents/opt-out`

**Data Retention**:
- **Active data**: Unlimited (user-controlled deletion)
- **Financial records**: 7 years (HMRC requirement)
- **Audit logs**: 7 years
- **Deleted accounts**: 90-day soft delete, then purge

**Breach Notification**:
- ICO: Within 72 hours of discovery
- Affected users: Without undue delay
- Documentation: Date, scope, impact, remediation

### Privacy Policy

Must include:
- What data we collect and why
- How long we retain it
- Who we share it with (processors)
- User rights and how to exercise them
- Contact details for DPO

Location: `/legal/privacy-policy`

## Communications Compliance

### PECR (Privacy and Electronic Communications Regulations)

**Email Marketing**:
- Opt-in required for marketing
- Unsubscribe link in every email
- Honor opt-out within 24 hours

**SMS Marketing**:
- Explicit opt-in required
- Must identify sender
- Opt-out keywords: STOP, UNSUBSCRIBE
- Honor opt-out immediately

**WhatsApp Business API**:
- Consent required
- 24-hour session window for free-form messages
- Template approval for marketing (via Twilio)

**Transactional Messages** (Exempt from Opt-In):
- Service notifications (ticket updates, appointment reminders)
- Account security (password resets)
- Legal/contractual obligations

**Implementation**:
- `ConsentRecord` table tracks opt-in/out per channel
- Check consent before sending marketing messages
- Transactional messages always allowed

## Property & Tenancy Compliance

### Landlord & Tenant Act 1985

**Repairing Obligations** (Section 11):
- Landlord must repair:
  - Structure and exterior
  - Heating and hot water installations
  - Sanitary installations (sinks, toilets, baths)
- Reasonable timeframe required

**MaintainUK Implementation**:
- Priority levels align with repair obligations
- SLA targets enforce reasonable timeframes
- Audit trail of repair requests and completion

### Housing Act 1988 & 2004

**Assured Shorthold Tenancies (AST)**:
- Most common tenancy type
- Deposit protection required (30 days)
- Notice periods defined

**Housing Health and Safety Rating System (HHSRS)**:
- Category 1 hazards must be addressed immediately
- Category 2 hazards must be addressed reasonably

**MaintainUK Implementation**:
- Emergency priority for Category 1 hazards (gas leaks, flooding, etc.)
- Compliance tracker for mandatory certifications

### Homes (Fitness for Human Habitation) Act 2018

Landlords must ensure properties are:
- Free from serious hazards
- In good repair
- Structurally sound
- Free from damp
- Have adequate lighting, heating, ventilation

**MaintainUK Implementation**:
- Ticket categories map to habitability requirements
- Compliance reminders for inspections

## Mandatory Safety Certifications

### Gas Safety Certificate (CP12)

**Legal Requirement**: Gas Safety (Installation and Use) Regulations 1998

**Frequency**: Annual

**Obligations**:
- Annual inspection by Gas Safe registered engineer
- Certificate provided to tenant within 28 days of inspection
- New tenant receives copy before move-in
- Landlord must keep records for 2 years

**MaintainUK Implementation**:
- `ComplianceItem` type: `GAS_SAFETY`
- Reminder notifications: 30, 14, 7 days before due
- Overdue alerts to landlord and admin

### Energy Performance Certificate (EPC)

**Legal Requirement**: Energy Performance of Buildings (England and Wales) Regulations 2012

**Frequency**: Valid for 10 years

**Minimum Standard**: Band E or above (since April 2020)

**Obligations**:
- Must be provided to tenant before tenancy starts
- Must be available for inspection

**MaintainUK Implementation**:
- `ComplianceItem` type: `EPC`
- Track expiry date
- Flag properties below Band E

### Electrical Installation Condition Report (EICR)

**Legal Requirement**: Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020

**Frequency**: Every 5 years (or change of tenancy)

**Obligations**:
- Inspection by qualified electrician
- Certificate provided to tenant within 28 days
- Remedial work completed within 28 days of report

**MaintainUK Implementation**:
- `ComplianceItem` type: `EICR`
- 5-year renewal reminder
- Track remedial work tickets

### Smoke & Carbon Monoxide Alarms

**Legal Requirement**: Smoke and Carbon Monoxide Alarm (England) Regulations 2015

**Obligations**:
- Smoke alarm on every floor with living space
- Carbon monoxide alarm in rooms with solid fuel appliances
- Working alarms at start of tenancy

**MaintainUK Implementation**:
- `ComplianceItem` type: `SMOKE_ALARM`, `CO_ALARM`
- Inspection checklist at tenancy start

### Legionella Risk Assessment

**Legal Requirement**: Health and Safety at Work Act 1974, Control of Substances Hazardous to Health (COSHH) Regulations 2002

**Frequency**: Every 2 years (or significant property changes)

**Obligations**:
- Identify and assess risk of legionella
- Implement control measures (flush unused outlets, check water temperature)

**MaintainUK Implementation**:
- `ComplianceItem` type: `LEGIONELLA_RISK`
- 2-year renewal reminder

## Deposit Protection

### Tenancy Deposit Scheme (TDS)

**Legal Requirement**: Housing Act 2004

**Obligations**:
- Protect deposit in approved scheme within 30 days
- Provide tenant with prescribed information (scheme details, how to apply for release)
- Return deposit within 10 days of agreement (or dispute resolution)

**Schemes**:
- Deposit Protection Service (DPS)
- MyDeposits
- Tenancy Deposit Scheme (TDS)

**MaintainUK Future Implementation** (Out of scope for v1):
- Track deposit protection status
- Remind landlords of 30-day deadline
- Integration with deposit scheme APIs

## Accessibility

### Equality Act 2010

**Obligations**:
- Websites and apps must be accessible to people with disabilities
- Reasonable adjustments required

**WCAG 2.1 Level AA** (Target):
- Perceivable: Text alternatives, captions, color contrast
- Operable: Keyboard navigation, skip links, focus visible
- Understandable: Consistent navigation, error identification
- Robust: Valid HTML, ARIA landmarks

**MaintainUK Implementation**:
- Angular Material components (accessible by default)
- Keyboard navigation tested
- Screen reader compatible
- Color contrast: 4.5:1 minimum for text
- ARIA labels on interactive elements

**Accessibility Statement**: `/legal/accessibility`

## Right to Rent Checks

**Legal Requirement**: Immigration Act 2014

**Obligations**:
- Landlord must check tenant's right to rent in UK before tenancy starts
- Keep copies of ID documents
- Repeat checks for time-limited permissions

**MaintainUK Future Implementation** (Out of scope for v1):
- Store right-to-rent check status
- Remind landlords to repeat checks

## Anti-Discrimination

### Equality Act 2010

**Protected Characteristics**:
- Age, disability, gender reassignment, marriage/civil partnership, pregnancy/maternity, race, religion/belief, sex, sexual orientation

**Obligations**:
- Cannot discriminate in tenant selection
- Cannot discriminate in service provision
- Must make reasonable adjustments for disabled tenants

**MaintainUK Implementation**:
- Ticket priority considers vulnerable tenants (elderly, children, health conditions)
- Emergency overrides for accessibility issues

## Financial Regulations

### Anti-Money Laundering (AML)

**Legal Requirement**: Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017

**Obligations** (if MaintainUK handles rent payments in future):
- Customer due diligence (ID verification)
- Report suspicious activity to National Crime Agency
- Keep records for 5 years

**Current Status**: v1 does not handle payments → AML not applicable

### Tax Reporting

**HMRC Obligations**:
- Keep financial records for 7 years
- Report interest on client accounts (if applicable)

**MaintainUK Implementation**:
- Invoice and payment records retained 7 years
- Audit logs retained 7 years

## Contractor Compliance

### Gas Safe Register

All gas work must be performed by Gas Safe registered engineers.

**MaintainUK Implementation**:
- `ContractorProfile.TradeLicenses` stores Gas Safe registration number
- Validate registration is current (future: API integration)

### Electrical Competent Person Schemes

Electricians must be registered with approved scheme (e.g., NICEIC, NAPIT).

**MaintainUK Implementation**:
- Store electrician certification in `TradeLicenses`

## Cookies & Tracking

### PECR & UK GDPR

**Obligations**:
- Cookie consent required for non-essential cookies
- Clear explanation of cookie purposes
- Opt-in for analytics and marketing cookies

**MaintainUK Implementation**:
- Essential cookies only (session, security) → no consent required
- Analytics cookies → opt-in banner
- No third-party advertising cookies

**Cookie Policy**: `/legal/cookies`

## Terms of Service

**Must Include**:
- Service description
- User obligations
- Liability limitations
- Termination conditions
- Governing law (England & Wales)
- Dispute resolution

**Location**: `/legal/terms-of-service`

## Compliance Checklist (Pre-Launch)

- [ ] GDPR data processing documentation complete
- [ ] ICO registration completed
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie policy published
- [ ] Accessibility statement published (with WCAG AA compliance)
- [ ] Data subject rights endpoints tested (access, erasure, portability)
- [ ] Consent management system tested (SMS/WhatsApp opt-in/out)
- [ ] Breach notification procedure documented
- [ ] DPO appointed and contact published
- [ ] Audit log retention (7 years) configured
- [ ] Financial record retention (7 years) configured
- [ ] Compliance tracking system functional (Gas Safety, EPC, EICR)
- [ ] Reminder notifications tested (30, 14, 7 days before due)

## Regulatory Contacts

- **ICO** (Data Protection): https://ico.org.uk, Tel: 0303 123 1113
- **Trading Standards** (Consumer issues): https://www.tradingstandardsapproved.gov.uk
- **RICS** (Property standards): https://www.rics.org
- **Gas Safe Register**: https://www.gassaferegister.co.uk, Tel: 0800 408 5500

---

**Last Updated**: 2025-12-31
**Next Review**: 2026-06-30 (Annual compliance review)
**Compliance Officer**: compliance@maintainuk.com

