# Admin Features E2E Test Plan

## Test Environment Status

✅ **API**: Running on http://localhost:5000
✅ **Web App**: Running on http://localhost:4200
✅ **Database**: Connected (Neon PostgreSQL)
✅ **Data Seeded**: 4 subscription plans, 8 feature flags

---

## Prerequisites

### 1. Create SuperAdmin User

Run this SQL command to upgrade the demo admin to SuperAdmin:

```sql
UPDATE "Users"
SET "Role" = 'SuperAdmin'
WHERE "Email" = 'admin@demo.maintainuk.com';
```

**Using psql**:
```bash
$env:PGPASSWORD = "npg_Iz7SaylJ0rhA"
psql -h ep-square-king-abq0rqc5-pooler.eu-west-2.aws.neon.tech -p 5432 -d neondb -U neondb_owner -c "UPDATE \"Users\" SET \"Role\" = 'SuperAdmin' WHERE \"Email\" = 'admin@demo.maintainuk.com' RETURNING \"Email\", \"Role\";"
```

---

## Test Scenarios

### Scenario 1: SuperAdmin Authentication & Navigation

**Objective**: Verify SuperAdmin login and admin section access

**Steps**:
1. Navigate to http://localhost:4200
2. Login with:
   - Email: `admin@demo.maintainuk.com`
   - Password: `Demo123!`
3. After login, verify the sidebar shows "Administration" link
4. Click "Administration" link

**Expected Results**:
- ✅ Login successful
- ✅ "Administration" link visible in sidebar
- ✅ Redirected to `/admin/users` (default route)
- ✅ Admin layout loads with sidebar navigation showing:
  - Organisations (SuperAdmin only)
  - Users
  - Audit Logs
  - Back to Dashboard

---

### Scenario 2: Organisation Management (SuperAdmin Only)

**Objective**: Test organisation CRUD operations

#### 2.1: View Organisations List

**Steps**:
1. In admin section, click "Organisations" in sidebar
2. Observe the organisations table

**Expected Results**:
- ✅ Table displays columns: Name, Slug, Plan, Status, Users, Created, Actions
- ✅ At least one organisation exists (demo admin's org)
- ✅ Plan chips are color-coded (Free=default, Pro=blue, Enterprise=purple)
- ✅ Status chips are color-coded (Active=blue, Suspended=red)

#### 2.2: Create New Organisation

**Steps**:
1. Click "Create Organisation" button
2. Fill in form:
   - Name: `Test Organisation`
   - Plan: Select `Professional`
3. Click "Create"

**Expected Results**:
- ✅ Success notification appears
- ✅ New organisation appears in table
- ✅ Slug is auto-generated (e.g., `test-organisation-abc123`)
- ✅ Status is "Active"
- ✅ User count is 0

#### 2.3: View Organisation Details

**Steps**:
1. Click the "visibility" icon on the new test organisation
2. Observe the detail page

**Expected Results**:
- ✅ Organisation information card shows:
  - Name
  - Slug (displayed as code)
  - Plan chip (Professional - blue)
  - Status chip (Active - blue)
  - Created/Updated timestamps
- ✅ "Suspend Organisation" button is visible
- ✅ Users table shows empty state: "No users in this organisation"

#### 2.4: Suspend Organisation

**Steps**:
1. On organisation detail page, click "Suspend Organisation"
2. Confirm in the dialog
3. Observe the changes

**Expected Results**:
- ✅ Confirmation dialog appears with warning text
- ✅ Success notification appears
- ✅ Status chip changes to "Suspended" (red)
- ✅ "Suspend Organisation" button is replaced with "Reactivate Organisation"

#### 2.5: Reactivate Organisation

**Steps**:
1. Click "Reactivate Organisation"
2. Confirm in the dialog

**Expected Results**:
- ✅ Success notification appears
- ✅ Status chip changes back to "Active" (blue)
- ✅ "Reactivate Organisation" button changes back to "Suspend Organisation"

#### 2.6: Navigate Back to List

**Steps**:
1. Click the back arrow button

**Expected Results**:
- ✅ Returns to organisations list
- ✅ Test organisation is still visible with updated status

---

### Scenario 3: User Management (OrgAdmin)

**Objective**: Test user CRUD operations and role management

#### 3.1: View Users List

**Steps**:
1. In admin section sidebar, click "Users"
2. Observe the users table

**Expected Results**:
- ✅ Table displays columns: Email, Name, Role, Status, Actions
- ✅ Current admin user is visible
- ✅ Role dropdown is displayed inline
- ✅ Status chips show "Active" (primary) or "Inactive"

#### 3.2: Create New User (Invite Flow)

**Steps**:
1. Click "Create User" button
2. Fill in form:
   - Email: `test.coordinator@demo.com`
   - First Name: `Test`
   - Last Name: `Coordinator`
   - Role: Select `Coordinator`
   - Phone: `+447700900000` (optional)
   - Toggle: Leave "Send Invite Email" ON
3. Click "Create"

**Expected Results**:
- ✅ Success notification appears
- ✅ New user appears in table
- ✅ User is marked as Active
- ✅ Role shows "Coordinator"

#### 3.3: Create New User (Direct Password)

**Steps**:
1. Click "Create User" button
2. Fill in form:
   - Email: `test.viewer@demo.com`
   - First Name: `Test`
   - Last Name: `Viewer`
   - Role: Select `Viewer`
   - Toggle: Turn OFF "Send Invite Email"
   - Password: `TestPassword123!`
3. Click "Create"

**Expected Results**:
- ✅ Password field appears when toggle is OFF
- ✅ Success notification appears
- ✅ New user appears in table

#### 3.4: Update User Role (Inline Editing)

**Steps**:
1. Find the "Test Viewer" user
2. Click the role dropdown
3. Select "Coordinator"
4. Wait for auto-save

**Expected Results**:
- ✅ Success notification appears
- ✅ Role updates in the table
- ✅ Page reloads to show updated role

#### 3.5: Attempt to Create OrgAdmin

**Steps**:
1. Click "Create User"
2. Set role to "OrgAdmin"
3. Complete form and submit

**Expected Results**:
- ✅ User is created successfully
- ✅ New OrgAdmin appears in table

#### 3.6: Set Primary Admin

**Steps**:
1. Find the newly created OrgAdmin user
2. Click the "verified" icon button (Set as Primary Admin)
3. Confirm in the dialog

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Success notification appears
- ✅ "Primary Admin" chip appears next to the user's role
- ✅ Old primary admin loses the badge
- ✅ "Set as Primary Admin" button no longer appears for this user

#### 3.7: Attempt to Deactivate Primary Admin (Should Fail)

**Steps**:
1. Find the user with "Primary Admin" badge
2. Click the "block" icon (Deactivate)
3. Confirm in the dialog

**Expected Results**:
- ✅ Error notification appears
- ✅ Error message: "Cannot deactivate Primary Admin. Assign a new Primary Admin first."
- ✅ User remains Active

#### 3.8: Attempt to Demote Last OrgAdmin (Should Fail)

**Steps**:
1. Deactivate all OrgAdmins except one
2. Try to change the last OrgAdmin's role to "Coordinator"

**Expected Results**:
- ✅ Error notification appears
- ✅ Error message: "Cannot demote the last OrgAdmin. Promote another user first."
- ✅ Role remains "OrgAdmin"

#### 3.9: Deactivate Non-Admin User

**Steps**:
1. Find a Coordinator or Viewer user
2. Click the "block" icon
3. Confirm in the dialog

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Success notification appears
- ✅ Status chip changes to "Inactive"
- ✅ Role dropdown becomes disabled
- ✅ Deactivate button disappears

---

### Scenario 4: Audit Log Viewing

**Objective**: Verify audit logs capture all admin actions

#### 4.1: View Audit Logs (OrgAdmin)

**Steps**:
1. In admin sidebar, click "Audit Logs"
2. Observe the audit log table

**Expected Results**:
- ✅ Table displays columns: Timestamp, User, Action, Entity Type, Changes, IP Address
- ✅ Recent actions are visible (organisation creation, user creation, role changes)
- ✅ Actions are color-coded:
  - Created: Green
  - Updated/Changed: Blue
  - Deleted/Deactivated/Suspended: Red
  - Invited: Orange

#### 4.2: View Change Details

**Steps**:
1. Find an entry with "View changes" link
2. Click to expand the details

**Expected Results**:
- ✅ Details expand showing JSON-formatted changes
- ✅ JSON is pretty-printed and readable
- ✅ Shows old and new values for changed fields

#### 4.3: Verify SuperAdmin Cross-Org View

**Steps**:
1. As SuperAdmin, view audit logs
2. Observe the indicator chip

**Expected Results**:
- ✅ Chip shows: "Viewing all organisations" (accent color)
- ✅ Audit logs from all organisations are visible
- ✅ Can see actions from different orgIds

---

### Scenario 5: Role-Based Access Control

**Objective**: Verify authorization policies work correctly

#### 5.1: OrgAdmin Cannot See Organisations Tab

**Steps**:
1. Create a new user with role "OrgAdmin" (not SuperAdmin)
2. Logout
3. Login with the new OrgAdmin credentials
4. Navigate to Admin section

**Expected Results**:
- ✅ "Administration" link is visible in main sidebar
- ✅ Admin section loads successfully
- ✅ "Organisations" link is NOT visible in admin sidebar (SuperAdmin only)
- ✅ "Users" link is visible
- ✅ "Audit Logs" link is visible

#### 5.2: Non-Admin Cannot Access Admin Section

**Steps**:
1. Logout
2. Login with a Coordinator or Viewer user
3. Observe the main sidebar

**Expected Results**:
- ✅ "Administration" link is NOT visible in sidebar
- ✅ Attempting to navigate to `/admin` redirects to `/dashboard`
- ✅ Direct API calls to admin endpoints return 401/403

#### 5.3: OrgAdmin Cannot Create SuperAdmin

**Steps**:
1. Login as OrgAdmin (not SuperAdmin)
2. Try to create a new user
3. Check available roles in dropdown

**Expected Results**:
- ✅ "SuperAdmin" is NOT in the role dropdown
- ✅ Available roles: Viewer, Coordinator, OrgAdmin, Contractor, Tenant
- ✅ If SuperAdmin is somehow selected, API returns error

---

### Scenario 6: Validation & Error Handling

**Objective**: Verify all validation rules work correctly

#### 6.1: Duplicate Email Validation

**Steps**:
1. Try to create a user with an email that already exists

**Expected Results**:
- ✅ Error notification appears
- ✅ Error message: "User with this email already exists in organisation"

#### 6.2: Primary Admin Must Be OrgAdmin

**Steps**:
1. Try to set a Coordinator as Primary Admin

**Expected Results**:
- ✅ Error notification appears
- ✅ Error message: "Primary Admin must have OrgAdmin role"

#### 6.3: Form Validation

**Steps**:
1. Try to create user with invalid email
2. Try to create user without required fields

**Expected Results**:
- ✅ Form validation errors appear
- ✅ Submit button is disabled until valid
- ✅ Red underlines on invalid fields

---

## API Endpoint Tests (Optional - via Swagger)

Navigate to http://localhost:5000/swagger to test API endpoints directly:

### SuperAdmin Endpoints (Require SuperAdmin role):
- `GET /api/v1/admin/organisations` - List all organisations
- `GET /api/v1/admin/organisations/{id}` - Get organisation details
- `POST /api/v1/admin/organisations` - Create organisation
- `POST /api/v1/admin/organisations/{id}/suspend` - Suspend organisation
- `POST /api/v1/admin/organisations/{id}/reactivate` - Reactivate organisation

### OrgAdmin Endpoints (Require OrgAdmin or SuperAdmin):
- `GET /api/v1/admin/users` - List users in organisation
- `POST /api/v1/admin/users` - Create/invite user
- `PATCH /api/v1/admin/users/{id}/role` - Update user role
- `POST /api/v1/admin/users/{id}/deactivate` - Deactivate user
- `POST /api/v1/admin/organisations/{orgId}/primary-admin` - Set primary admin
- `GET /api/v1/admin/audit-logs` - List audit logs

---

## Success Criteria

### Functionality
- ✅ All CRUD operations work for organisations
- ✅ All CRUD operations work for users
- ✅ Role-based access control enforced (UI and API)
- ✅ Audit logs capture all admin actions
- ✅ Validation rules prevent invalid operations

### Security
- ✅ SuperAdmin can manage organisations
- ✅ OrgAdmin cannot access organisations
- ✅ Non-admins cannot access admin section
- ✅ Cannot modify Primary Admin without reassignment
- ✅ Cannot remove last OrgAdmin
- ✅ OrgAdmin cannot create SuperAdmin users

### UX
- ✅ Loading states show during API calls
- ✅ Error messages are user-friendly
- ✅ Success notifications appear for actions
- ✅ Confirmation dialogs for destructive actions
- ✅ Empty states guide users
- ✅ Color coding makes status clear
- ✅ Navigation is intuitive

### Data Integrity
- ✅ Audit logs created for all mutations
- ✅ Database constraints enforced
- ✅ Multi-tenancy maintained (OrgAdmin sees only their org)
- ✅ SuperAdmin bypass works for cross-org queries

---

## Troubleshooting

### Issue: Port already in use
**Solution**: Kill existing process or use different port

### Issue: Login fails
**Solution**: Verify user exists in database and password is correct

### Issue: 401 Unauthorized
**Solution**: Token may be expired, logout and login again

### Issue: Role not updating in UI
**Solution**: Check browser console for errors, verify API response

### Issue: Audit logs empty
**Solution**: Perform some admin actions first, then refresh

---

## Test Results Template

```markdown
## Test Execution Report

**Date**: _____________
**Tester**: _____________
**Environment**: Local Development

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. SuperAdmin Auth & Nav | ☐ Pass ☐ Fail | |
| 2.1 View Organisations | ☐ Pass ☐ Fail | |
| 2.2 Create Organisation | ☐ Pass ☐ Fail | |
| 2.3 View Org Details | ☐ Pass ☐ Fail | |
| 2.4 Suspend Organisation | ☐ Pass ☐ Fail | |
| 2.5 Reactivate Organisation | ☐ Pass ☐ Fail | |
| 3.1 View Users | ☐ Pass ☐ Fail | |
| 3.2 Create User (Invite) | ☐ Pass ☐ Fail | |
| 3.3 Create User (Password) | ☐ Pass ☐ Fail | |
| 3.4 Update Role | ☐ Pass ☐ Fail | |
| 3.6 Set Primary Admin | ☐ Pass ☐ Fail | |
| 3.7 Deactivate Primary (Fail) | ☐ Pass ☐ Fail | |
| 3.8 Demote Last Admin (Fail) | ☐ Pass ☐ Fail | |
| 3.9 Deactivate User | ☐ Pass ☐ Fail | |
| 4.1 View Audit Logs | ☐ Pass ☐ Fail | |
| 4.2 View Changes | ☐ Pass ☐ Fail | |
| 5.1 OrgAdmin No Orgs Tab | ☐ Pass ☐ Fail | |
| 5.2 Non-Admin No Access | ☐ Pass ☐ Fail | |
| 6.1 Duplicate Email | ☐ Pass ☐ Fail | |
| 6.2 Primary Must Be Admin | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ Pass ☐ Fail
**Notes**:
```

---

## Next Steps

1. Execute all test scenarios above
2. Document any bugs or issues found
3. Verify fixes for any failures
4. Perform regression testing
5. Sign off on admin features for production deployment
