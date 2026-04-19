# Frontend Organization Setup Guide

This guide explains the company, branch, branch location, branch network/IP, and department APIs recently added for the frontend implementation.

## Common Rules

- Base URL: `http://localhost:3001/api/v1` or your deployed API URL.
- Auth: send JWT access token as `Authorization: Bearer <accessToken>`.
- Swagger: `http://localhost:3001/api/docs`.
- Delete APIs are soft delete. The backend sets `deletedAt` and hides the record from normal lists.
- Delete APIs can return `400` when related data still depends on the record. Show the returned `message` to the user and ask them to reassign, remove, end, or deactivate the related records first.
- All successful API responses are wrapped:

```json
{
  "isSuccess": true,
  "message": "Optional message",
  "data": {}
}
```

- All error API responses are wrapped:

```json
{
  "isSuccess": false,
  "statusCode": 400,
  "path": "/api/v1/example",
  "timestamp": "2026-04-19T10:00:00.000Z",
  "message": "Validation failed",
  "errors": {}
}
```

## Country Dropdown API

Use this API for country selectors, address forms, and phone dial-code selectors.

### List Countries

`GET /countries`

Optional query parameters:
- `search`: searches country name, official name, ISO code, dial code, currency code, and language code
- `region`: filters by region, for example `Asia`, `Europe`, `Africa`, `Americas`, or `Oceania`

Example:

```ts
const countries = await api.get('/countries', {
  params: {
    search: 'bangladesh',
  },
});
```

### Get One Country

`GET /countries/:code`

The `code` can be ISO alpha-2 or alpha-3.

Examples:
- `/countries/BD`
- `/countries/BGD`

Useful frontend fields:
- `name`
- `officialName`
- `alpha2Code`
- `alpha3Code`
- `dialCode`
- `dialCodes`
- `flag`
- `region`
- `subregion`
- `capital`
- `currencyCodes`
- `currencies`
- `languageCodes`
- `languages`
- `timezones`

## Recommended Frontend Flow

1. Create or select a company.
2. Create company departments.
3. Create a branch under the company.
4. Add one or more branch locations.
5. Add one or more branch networks/IP rules.
6. Assign departments to the branch.
7. When creating employees later, use selected company, branch, and department IDs.

This order matters because branch and department creation now require `companyId`, and branch department assignment requires both `branchId` and `departmentId`.

## Permissions Needed

Use these permission codes when showing or hiding frontend actions:

| UI action | Permission |
| --- | --- |
| View companies | `company:read` |
| Create company | `company:create` |
| Update company | `company:update` |
| Delete company | `company:delete` |
| View branches | `branch:read` |
| Create branch, branch location, branch network | `branch:create` |
| Update branch, location, network, branch department assignment | `branch:update` |
| Delete branch | `branch:delete` |
| View departments | `department:read` |
| Create department | `department:create` |
| Update department | `department:update` |
| Delete department | `department:delete` |

## Company APIs

Company is the parent organization. Branches and departments belong to a company.

### List Companies

`GET /companies`

Use for:
- company dropdown
- company management list

Response data example:

```json
[
  {
    "id": "uuid",
    "name": "Acme Group",
    "code": "ACME",
    "email": "hr@acme.com",
    "phone": "+8801000000000",
    "status": 1,
    "createdAt": "2026-04-19T10:00:00.000Z",
    "updatedAt": "2026-04-19T10:00:00.000Z"
  }
]
```

### Create Company

`POST /companies`

Request body:

```json
{
  "name": "Acme Group",
  "code": "ACME",
  "email": "hr@acme.com",
  "phone": "+8801000000000",
  "status": 1
}
```

Frontend validation:
- `name` is required.
- `code` is required and should be unique.
- `email` is optional but must be valid if provided.
- `status` can be `1` for active or `0` for inactive.

### Update Company

`PATCH /companies/:id`

Request body can be partial:

```json
{
  "name": "Acme Global",
  "status": 1
}
```

### Delete Company

`DELETE /companies/:id`

Use carefully. In a production UI, prefer status change to `0` unless hard delete is intended.

## Department APIs

Departments are company-level master records. They can also have a parent department for hierarchy.

### List Departments

`GET /departments`

Use for:
- department table
- department dropdown
- branch department assignment

Response data example:

```json
[
  {
    "id": "uuid",
    "company": {
      "id": "uuid",
      "name": "Acme Group",
      "code": "ACME"
    },
    "name": "Human Resources",
    "code": "HR",
    "description": "People operations",
    "parentDepartment": null,
    "status": 1
  }
]
```

### Create Department

`POST /departments`

Request body:

```json
{
  "companyId": "company-uuid",
  "name": "Human Resources",
  "code": "HR",
  "description": "People operations",
  "parentDepartmentId": "parent-department-uuid",
  "status": 1
}
```

Frontend validation:
- `companyId` is required.
- `name` is required.
- `code` is optional but should be unique inside the company.
- `parentDepartmentId` is optional.
- `status` can be `1` for active or `0` for inactive.

### Update Department

`PATCH /departments/:id`

Request body can be partial:

```json
{
  "name": "People Operations",
  "parentDepartmentId": "parent-department-uuid",
  "status": 1
}
```

### Delete Department

`DELETE /departments/:id`

Use only when the department is not needed. If employees already use the department, prefer setting `status` to `0`.

## Branch APIs

Branch is the physical or business unit under a company. Examples: office, factory, warehouse, remote hub.

### List Branches

`GET /branches`

Use for:
- branch table
- branch dropdown
- branch detail page

The response includes nested `company`, `locations`, `networks`, and `branchDepartments`.

### Create Branch

`POST /branches`

Request body:

```json
{
  "companyId": "company-uuid",
  "name": "Dhaka Head Office",
  "code": "DHK-HQ",
  "email": "dhaka@acme.com",
  "phone": "+8801000000000",
  "branchType": "office",
  "managerEmployeeId": "employee-uuid",
  "status": 1,
  "openedOn": "2026-04-19",
  "closedOn": null,
  "addressLine1": "House 1, Road 2",
  "addressLine2": "Level 5",
  "city": "Dhaka",
  "stateCode": "DHA",
  "countryCode": "BD",
  "postalCode": "1200",
  "isActive": true
}
```

Frontend validation:
- `companyId` is required.
- `name` is required.
- `branchType` options: `office`, `factory`, `warehouse`, `remote_hub`.
- `status` options: `1` active, `0` inactive, `2` closed.
- `openedOn` and `closedOn` should be date strings: `YYYY-MM-DD`.
- `managerEmployeeId` is optional and should be sent only after employee records exist.

### Update Branch

`PATCH /branches/:id`

Request body can be partial:

```json
{
  "name": "Dhaka Main Office",
  "status": 1,
  "branchType": "office"
}
```

### Delete Branch

`DELETE /branches/:id`

Use carefully. For production UI, prefer changing `status` to `0` inactive or `2` closed.

## Branch Location APIs

Branch location stores normalized address, GPS, timezone, and primary-location flag.

### List Branch Locations

`GET /branches/:branchId/locations`

Use for:
- branch detail location tab
- attendance/geofence setup screen

### Create Branch Location

`POST /branches/:branchId/locations`

Request body:

```json
{
  "locationLabel": "main",
  "addressLine1": "House 1, Road 2",
  "addressLine2": "Level 5",
  "city": "Dhaka",
  "stateRegion": "Dhaka",
  "postalCode": "1200",
  "country": "Bangladesh",
  "latitude": 23.810331,
  "longitude": 90.412521,
  "timezone": "Asia/Dhaka",
  "isPrimary": true
}
```

Frontend validation:
- `addressLine1`, `city`, `country`, and `timezone` are required.
- `latitude` and `longitude` are optional here, but should be provided if you want location-based attendance validation.
- `isPrimary` should be true for the main office location.

### Update Branch Location

`PATCH /branches/:branchId/locations/:locationId`

Request body can be partial:

```json
{
  "locationLabel": "annex",
  "isPrimary": false
}
```

## Branch Network/IP APIs

Branch network stores trusted IPs, VPN IPs, gateways, device IPs, or subnets. Attendance can match against these records.

### List Branch Networks

`GET /branches/:branchId/networks`

Use for:
- branch network/IP setup table
- attendance security settings

### Create Branch Network

`POST /branches/:branchId/networks`

Request body for exact IP:

```json
{
  "networkType": "public_ip",
  "label": "Main ISP",
  "ipAddress": "103.10.20.30",
  "deviceName": "Office Router",
  "isActive": true,
  "validFrom": "2026-04-19",
  "validTo": null
}
```

Request body for subnet:

```json
{
  "networkType": "wifi_subnet",
  "label": "Office Wi-Fi",
  "cidr": "192.168.1.0/24",
  "deviceName": "Wi-Fi Gateway",
  "isActive": true
}
```

Frontend validation:
- `networkType` options: `public_ip`, `backup_ip`, `vpn_ip`, `device_ip`, `gateway_ip`, `wifi_subnet`, `other`.
- Send either `ipAddress` or `cidr`.
- `ipAddress` must be a valid IP address.
- `cidr` should use IPv4 CIDR format, for example `192.168.1.0/24`.
- `validFrom` and `validTo` should be `YYYY-MM-DD`.

### Update Branch Network

`PATCH /branches/:branchId/networks/:networkId`

Request body can be partial:

```json
{
  "label": "Backup ISP",
  "isActive": false
}
```

## Branch Department Assignment APIs

This maps which departments exist inside a branch. Not every branch needs every department.

### List Branch Departments

`GET /branches/:branchId/departments`

Use for:
- branch department tab
- department assignment table
- employee assignment dropdown filtered by branch

### Assign Department To Branch

`POST /branches/:branchId/departments`

Request body:

```json
{
  "departmentId": "department-uuid",
  "localName": "People Team",
  "floorNo": "5",
  "roomNo": "501",
  "status": 1
}
```

How it works:
- If the department is not already assigned to the branch, it creates the assignment.
- If the department is already assigned, it updates the assignment details.

Frontend validation:
- `departmentId` is required.
- `status` options: `1` active, `0` inactive.
- `localName`, `floorNo`, and `roomNo` are optional.

## Office Location Attendance Matching

The existing office location module can now link an office location to a branch.

### Create Office Location

`POST /office-locations`

Request body:

```json
{
  "name": "Dhaka HQ Attendance Zone",
  "branchId": "branch-uuid",
  "locationLabel": "main",
  "latitude": 23.810331,
  "longitude": 90.412521,
  "address": "House 1, Road 2, Dhaka",
  "timezone": "Asia/Dhaka",
  "trustedIps": ["103.10.20.30"],
  "allowedRadiusMeters": 150,
  "isActive": true
}
```

How attendance matching works:
- First, backend checks exact `trustedIps` from the office location.
- Then, backend checks branch network records by exact `ipAddress`.
- Then, backend checks branch network records by IPv4 `cidr`.
- If IP does not match, backend falls back to GPS distance using `latitude`, `longitude`, and `allowedRadiusMeters`.

Frontend implication:
- For office attendance setup, show both GPS geofence fields and network/IP fields.
- If a company wants IP-only attendance, create a branch network and link an office location to that branch.
- If a company wants GPS-only attendance, create an active office location with latitude/longitude and radius.

## Suggested Frontend Screens

### Company Management

Fields:
- name
- code
- email
- phone
- status

Actions:
- list
- create
- edit
- deactivate/delete

### Department Management

Fields:
- company
- name
- code
- parent department
- description
- status

Actions:
- list
- create
- edit
- delete/deactivate

### Branch Management

Fields:
- company
- branch name
- code
- branch type
- contact email
- contact phone
- manager
- status
- opened on
- closed on

Tabs inside branch detail:
- Locations
- Networks/IPs
- Departments

### Branch Location Tab

Fields:
- location label
- address line 1
- address line 2
- city
- state/region
- postal code
- country
- latitude
- longitude
- timezone
- primary

### Branch Network Tab

Fields:
- network type
- label
- exact IP address
- CIDR/subnet
- device name
- active
- valid from
- valid to

### Branch Departments Tab

Fields:
- department dropdown
- local name
- floor no
- room no
- status

## TypeScript Types For Frontend

```ts
type ActiveStatus = 0 | 1;
type CompanyStatus = ActiveStatus;
type BranchType = 'office' | 'factory' | 'warehouse' | 'remote_hub';
type BranchStatus = 0 | 1 | 2;
type DepartmentStatus = ActiveStatus;
type BranchNetworkType =
  | 'public_ip'
  | 'backup_ip'
  | 'vpn_ip'
  | 'device_ip'
  | 'gateway_ip'
  | 'wifi_subnet'
  | 'other';
type BranchDepartmentStatus = ActiveStatus;

interface ApiResponse<T> {
  isSuccess: boolean;
  message?: string;
  data: T;
}
```

## Example Frontend Creation Sequence

```ts
const company = await api.post('/companies', {
  name: 'Acme Group',
  code: 'ACME',
});

const department = await api.post('/departments', {
  companyId: company.data.data.id,
  name: 'Human Resources',
  code: 'HR',
});

const branch = await api.post('/branches', {
  companyId: company.data.data.id,
  name: 'Dhaka Head Office',
  code: 'DHK-HQ',
  branchType: 'office',
  status: 1,
});

await api.post(`/branches/${branch.data.data.id}/locations`, {
  locationLabel: 'main',
  addressLine1: 'House 1, Road 2',
  city: 'Dhaka',
  country: 'Bangladesh',
  timezone: 'Asia/Dhaka',
  latitude: 23.810331,
  longitude: 90.412521,
  isPrimary: true,
});

await api.post(`/branches/${branch.data.data.id}/networks`, {
  networkType: 'public_ip',
  label: 'Main ISP',
  ipAddress: '103.10.20.30',
  isActive: true,
});

await api.post(`/branches/${branch.data.data.id}/departments`, {
  departmentId: department.data.data.id,
  localName: 'People Team',
  status: 1,
});
```

## Important Production Notes

- The backend currently uses TypeORM `synchronize: true`; before production deployment, replace this with migrations.
- In frontend UI, prefer deactivation (`status: 0`) over hard delete for company, branch, and department records.
- Branch network CIDR matching currently supports IPv4 CIDR.
- If your frontend caches permissions, refresh them after login or role/permission update.
