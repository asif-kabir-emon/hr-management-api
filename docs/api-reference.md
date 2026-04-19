# API Reference

This document explains each module in the current HR Management API and how each exposed API works.

## Common conventions

- Base path: `/api/v1`
- Authentication: JWT bearer token unless the endpoint is explicitly public.
- Authorization: permission-based with `PermissionsGuard`.
- Response wrapper:

```json
{
  "isSuccess": true,
  "message": "Optional success message",
  "data": {}
}
```

- Error wrapper:

```json
{
  "isSuccess": false,
  "statusCode": 400,
  "path": "/api/v1/example",
  "timestamp": "2026-04-16T12:00:00.000Z",
  "message": "Something went wrong",
  "errors": {}
}
```

## Auth module

Purpose:
- registration and login
- password lifecycle management
- token/session lifecycle
- access-control and permission management

### `POST /auth/register`

How it works:
- accepts user identity data such as email, password, full name, role, and optional permissions
- normalizes the email
- assigns default role permissions if explicit permissions are not provided
- creates the user in PostgreSQL
- writes an audit log
- creates an auth session and returns access/refresh tokens

Use when:
- onboarding a new system user

Important notes:
- duplicate email is rejected
- super admin defaults to wildcard access

### `POST /auth/login`

How it works:
- accepts email and password
- checks rolling login-attempt rate limits
- validates password
- tracks device and IP
- reuses or rotates the device session
- returns access/refresh tokens and current permissions

Use when:
- signing a user into the platform

Important notes:
- too many wrong passwords disables the user
- only 3 active device sessions are allowed, with oldest-session replacement logic already implemented

### `POST /auth/refresh-token`

How it works:
- accepts refresh token
- verifies JWT signature and token type
- validates the session record and stored hashed refresh token
- rotates access token and refresh token
- updates session hashes and last-used metadata

Use when:
- refreshing login without forcing the user to log in again

### `POST /auth/change-password`

How it works:
- requires bearer token
- accepts current password and new password
- verifies current password
- enforces max password changes in the last 24 hours
- saves the new password hash
- records password-change history
- revokes active sessions

Use when:
- user wants to change password while logged in

### `POST /auth/forgot-password`

How it works:
- accepts email
- if account exists, checks forgot-password request limits in the last 24 hours
- creates a password-reset request with hashed token, expiry, IP, device info, and reset URL
- writes audit data

Use when:
- user forgot the password

Important notes:
- current implementation returns the reset URL in the API response for development/testing

### `POST /auth/reset-password`

How it works:
- accepts raw reset token and new password
- hashes the incoming token
- finds a valid unused reset request
- rejects expired or already-used tokens
- updates password
- resets failed login state
- marks the token as used
- revokes sessions

Use when:
- user is resetting password through a password-reset link

### `GET /auth/access-control/permissions`

How it works:
- requires `user:manage`
- returns the full permission catalog from the backend constants
- groups each permission by module prefix

Use when:
- building admin UI for permission management

### `GET /auth/access-control/roles`

How it works:
- requires `user:manage`
- returns all supported roles and their default permission templates

Use when:
- building role picker or access template UI

### `GET /auth/access-control/users`

How it works:
- requires `user:manage`
- returns all non-deleted users with role, permissions, active status, and timestamps

Use when:
- reviewing current access assignments

### `PATCH /auth/access-control/users/:id`

How it works:
- requires `user:manage`
- updates role, active status, and/or permissions for one user
- can either:
  - replace with explicit permissions
  - apply role template
  - merge role template with explicit permissions
- validates permission codes before saving
- writes audit log

Use when:
- changing access for a specific user

Useful body fields:
- `role`
- `permissions`
- `mergeWithRoleTemplate`
- `isActive`

## Audit module

Purpose:
- immutable event trail

### `GET /audit-logs`

How it works:
- requires `audit:read`
- returns latest audit log records from MongoDB
- optional `limit` query reduces or expands result size

Use when:
- reviewing system activity

### `POST /audit-logs`

How it works:
- requires `audit:create`
- accepts audit payload and writes a record manually

Use when:
- a custom integration needs manual audit insertion

## Branches module

Purpose:
- branch master data

### `GET /branches`

How it works:
- requires `branch:read`
- returns all branch records

### `GET /branches/:id`

How it works:
- requires `branch:read`
- returns one branch by ID

### `POST /branches`

How it works:
- requires `branch:create`
- accepts branch details such as name, code, contact, and address
- creates a branch record

### `PATCH /branches/:id`

How it works:
- requires `branch:update`
- updates mutable branch fields

### `DELETE /branches/:id`

How it works:
- requires `branch:delete`
- removes the branch record

## Departments module

Purpose:
- department master data

### `GET /departments`

How it works:
- requires `department:read`
- returns all departments

### `GET /departments/:id`

How it works:
- requires `department:read`
- returns one department

### `POST /departments`

How it works:
- requires `department:create`
- creates a department using name/code/description data

## Dashboard module

Purpose:
- manager/admin overview endpoint

### `GET /dashboard/overview`

How it works:
- requires `dashboard:read`
- supports filters:
  - `branchId`
  - `departmentId`
  - `employeeId`
  - `search`
  - `startDate`
  - `endDate`
- returns:
  - viewer role and permissions
  - employee totals
  - attendance summary
  - attendance grouped by branch
  - attendance grouped by department
  - recent attendance records
  - leave summary
  - pending approval queues based on current user permissions

Use when:
- loading a dashboard homepage

## Employees module

Purpose:
- employee master profile and lifecycle

### `GET /employees`

How it works:
- requires `employee:read`
- returns employee list with branch and department eager-loaded

### `GET /employees/:id`

How it works:
- requires `employee:read`
- returns one employee profile

### `GET /employees/:id/department-history`

How it works:
- requires `employee:read`
- returns historical department assignment/transfer records

### `GET /employees/:id/branch-history`

How it works:
- requires `employee:read`
- returns historical branch assignment/transfer records

### `GET /employees/:id/employment-history`

How it works:
- requires `employee:read`
- returns join, rejoin, resign, and terminate events

### `POST /employees`

How it works:
- requires `employee:create`
- accepts employee master profile sections:
  - basic identity
  - personal information
  - bank information
  - salary information
  - address information
  - joining information
  - branch and department
- creates the employee
- creates initial department/branch history if assigned
- creates initial employment history

### `PATCH /employees/:id`

How it works:
- requires `employee:update`
- updates any profile section
- records branch/department history if those assignments change

### `PATCH /employees/:id/department`

How it works:
- requires `employee:update`
- transfers employee to another department
- records department history

### `PATCH /employees/:id/branch`

How it works:
- requires `employee:update`
- transfers employee to another branch
- records branch history

### `POST /employees/:id/employment-events`

How it works:
- requires `employee:update`
- records joined/rejoined/resigned/terminated event
- updates employee status and joining information

## Holidays module

Purpose:
- holiday rules for all, state, department, or specific employee

### `GET /holidays`

How it works:
- requires `holiday:read`
- returns all holiday rules

### `GET /holidays/:id`

How it works:
- requires `holiday:read`
- returns one holiday

### `POST /holidays`

How it works:
- requires `holiday:create`
- creates a holiday rule with type, scope, date, and paid/optional flags

### `PATCH /holidays/:id`

How it works:
- requires `holiday:update`
- updates holiday rule data

### `DELETE /holidays/:id`

How it works:
- requires `holiday:delete`
- deletes the holiday rule

## Leave module

Purpose:
- leave types
- leave balances
- leave requests
- leave approval

### `GET /leave-requests`

How it works:
- requires `leave:read`
- returns leave requests with optional filters:
  - `branchId`
  - `departmentId`
  - `startDate`
  - `endDate`
  - `search`

### `GET /leave-requests/pending`

How it works:
- requires `leave:read`
- same as list endpoint but restricted to `pending`

### `GET /leave-requests/approved`

How it works:
- requires `leave:read`
- same as list endpoint but restricted to `approved`

### `GET /leave-requests/types`

How it works:
- requires `leave-type:read`
- returns available leave types

### `GET /leave-requests/balances/me`

How it works:
- requires `leave-balance:read`
- resolves current user to employee profile
- returns that employee’s leave balances

### `GET /leave-requests/requests/me`

How it works:
- requires `leave:read`
- resolves current user to employee profile
- returns that employee’s leave requests

### `GET /leave-requests/balances/:employeeId`

How it works:
- requires `leave-balance:read`
- returns leave balances for one employee

### `POST /leave-requests/types`

How it works:
- requires `leave-type:create`
- creates a leave type like annual, sick, unpaid, etc.

### `PATCH /leave-requests/types/:id`

How it works:
- requires `leave-type:update`
- updates leave type settings

### `PATCH /leave-requests/balances`

How it works:
- requires `leave-balance:manage`
- creates or updates one employee leave balance for one leave type and year

### `POST /leave-requests`

How it works:
- requires `leave:create`
- validates employee and leave type
- calculates requested days from `startDate` and `endDate`
- checks available balance if the leave type requires balance
- increases pending balance
- creates leave request in pending state

### `PATCH /leave-requests/:id/review`

How it works:
- requires `leave:approve`
- only works on pending leave requests
- accepts approve or reject decision
- releases pending leave balance
- moves approved days into used balance when approved

## Notices module

Purpose:
- broad announcements

### `POST /notices`

How it works:
- requires `notice:create`
- creates a notice with:
  - title
  - content
  - optional branch/department targeting
  - optional permission targeting
  - optional direct user targeting
  - optional pin flag
- notice starts in draft unless published later

### `GET /notices`

How it works:
- requires `notice:read`
- returns all notices ordered with pinned notices first

### `GET /notices/me`

How it works:
- requires `notice:read`
- resolves the current user’s employee profile
- returns only published notices visible to that user
- visibility is based on:
  - direct user targeting
  - permission targeting
  - branch match
  - department match

### `PATCH /notices/:id/status`

How it works:
- requires `notice:publish`
- updates notice state to `draft`, `published`, or `archived`
- sets `publishedAt` when published

## Notifications module

Purpose:
- targeted in-app notifications

### `POST /notifications`

How it works:
- requires `notification:create`
- accepts:
  - title
  - message
  - type
  - direct recipient user IDs
  - recipient permissions
  - optional reference type/id
  - optional metadata
- resolves recipients from user IDs and/or permission matches
- creates one notification record per recipient

### `GET /notifications/me`

How it works:
- requires `notification:read`
- returns current user’s notifications ordered newest first

### `GET /notifications/me/unread-count`

How it works:
- requires `notification:read`
- returns unread notification count for current user

### `PATCH /notifications/:id/read`

How it works:
- requires `notification:read`
- marks the selected notification as read for current user only

## Office locations module

Purpose:
- office geofence and trusted IP management

### `GET /office-locations`

How it works:
- requires `office-location:read`
- returns all office location records

### `GET /office-locations/:id`

How it works:
- requires `office-location:read`
- returns one office location

### `POST /office-locations`

How it works:
- requires `office-location:create`
- creates office geofence data with:
  - latitude/longitude
  - radius
  - address
  - trusted IPs

### `PATCH /office-locations/:id`

How it works:
- requires `office-location:update`
- updates office location settings

### `DELETE /office-locations/:id`

How it works:
- requires `office-location:delete`
- deletes office location

## Attendance module

Purpose:
- attendance tracking and approval

### `GET /attendance`

How it works:
- requires `attendance:read`
- returns attendance records with optional filters:
  - `branchId`
  - `departmentId`
  - `employeeId`
  - `search`
  - `startDate`
  - `endDate`

### `GET /attendance/me`

How it works:
- requires `attendance:read`
- resolves current user to employee profile
- returns only that employee’s attendance records

### `GET /attendance/pending`

How it works:
- requires `attendance:read`
- same filter behavior as attendance list
- only returns pending approval records

### `GET /attendance/approved`

How it works:
- requires `attendance:read`
- same filter behavior as attendance list
- only returns approved records

### `GET /attendance/missing`

How it works:
- requires `attendance:read`
- requires `startDate` and `endDate`
- checks each filtered employee and each date in the range
- excludes dates where:
  - attendance exists
  - approved leave exists
  - the day is an off day or holiday
- returns only working dates where attendance was not submitted

### `POST /attendance`

How it works:
- requires `attendance:create`
- accepts employee, work date, check-in/out details, break records, and optional location/IP
- resolves whether the day is a normal working day, holiday, or off day
- tries office matching by trusted IP first, then by geofence
- stores:
  - check-in/check-out location details
  - office match metadata
  - break records
  - off-day attendance flags
- creates attendance in pending approval state

### `PATCH /attendance/:id/approval`

How it works:
- requires `attendance:approve`
- approves or rejects an attendance record
- stores approver identity, approval time, and notes

## Payroll module

Purpose:
- payroll run generation
- payroll item adjustment
- payroll workflow submission

### `GET /payroll/runs`

How it works:
- requires `payroll:read`
- returns payroll runs with filters:
  - `branchId`
  - `departmentId`
  - `status`
  - `startDate`
  - `endDate`
  - `search`

### `GET /payroll/runs/:id`

How it works:
- requires `payroll:read`
- returns one payroll run plus its generated payroll items

### `POST /payroll/runs`

How it works:
- requires `payroll:create`
- accepts run name, period, optional pay date, branch, department, currency, and notes
- validates the period date range
- finds eligible employees
- generates one payroll item per employee from salary snapshot data
- calculates totals and creates draft payroll run

### `PATCH /payroll/runs/:id/items/:itemId`

How it works:
- requires `payroll:update`
- only works while payroll run is in draft
- updates bonus, deduction, and remarks for one payroll item
- recalculates item net pay
- recalculates run totals

### `PATCH /payroll/runs/:id/submit`

How it works:
- requires `payroll:create`
- only works while payroll run is in draft
- ensures a payroll approval workflow exists
- starts workflow instance
- links workflow to payroll run
- changes payroll run status to pending approval

## Work schedules module

Purpose:
- schedules, assignments, overrides, and off-day replacement flow

### `GET /work-schedules`

How it works:
- requires `work-schedule:read`
- returns all work schedules

### `GET /work-schedules/assignments`

How it works:
- requires `work-schedule:read`
- returns employee-to-schedule assignments

### `GET /work-schedules/employee-day-overrides`

How it works:
- requires `work-schedule:read`
- returns date-specific overrides for employees

### `GET /work-schedules/off-day-replacement-requests`

How it works:
- requires `work-schedule:read`
- returns off-day replacement requests

### `GET /work-schedules/employees/:employeeId/day-status`

How it works:
- requires `work-schedule:read`
- accepts `date` query
- resolves whether that employee/date is working day, off day, holiday, or override

### `GET /work-schedules/:id`

How it works:
- requires `work-schedule:read`
- returns one work schedule

### `POST /work-schedules`

How it works:
- requires `work-schedule:create`
- creates a reusable weekly work schedule

### `POST /work-schedules/assignments`

How it works:
- requires `work-schedule:create`
- assigns a schedule to an employee with effective dates

### `POST /work-schedules/employee-day-overrides`

How it works:
- requires `work-schedule:create`
- creates a specific-date override like off day or working day

### `POST /work-schedules/off-day-replacement-requests`

How it works:
- requires `work-schedule:create`
- requests a swap between an original off day and a replacement day
- validates that the original date is truly off and the replacement is workable

### `PATCH /work-schedules/off-day-replacement-requests/:id/review`

How it works:
- requires `work-schedule:approve`
- approves or rejects a swap request
- if approved, creates the day overrides that make the swap effective

### `PATCH /work-schedules/:id`

How it works:
- requires `work-schedule:update`
- updates work schedule definition

### `DELETE /work-schedules/:id`

How it works:
- requires `work-schedule:delete`
- deletes the work schedule

## Workflows module

Purpose:
- reusable approval engine

### `GET /workflows/definitions`

How it works:
- requires `workflow:read`
- returns workflow definitions

### `POST /workflows/definitions`

How it works:
- requires `workflow:create`
- creates workflow definition with ordered steps and required permissions per step

### `PATCH /workflows/definitions/:id`

How it works:
- requires `workflow:update`
- updates workflow definition and revalidates step ordering

### `GET /workflows/instances`

How it works:
- requires `workflow:read`
- returns workflow instances
- supports:
  - `referenceType`
  - `referenceId`
  - `status`

### `GET /workflows/instances/:id`

How it works:
- requires `workflow:read`
- returns one workflow instance with step states

### `PATCH /workflows/instances/:id/review`

How it works:
- requires `workflow:approve`
- finds current active step
- verifies reviewer has the permission required by that step
- blocks self-approval if step disallows it
- approves current step and moves to next step, or rejects entire workflow
- updates linked payroll status when workflow reference is a payroll run

## Permission summary

Typical permissions include:

- `employee:read`
- `attendance:create`
- `attendance:approve`
- `leave:approve`
- `payroll:approve`
- `workflow:approve`
- `notification:create`
- `notice:publish`
- `user:manage`

For the exact runtime list, use:

- `GET /auth/access-control/permissions`
