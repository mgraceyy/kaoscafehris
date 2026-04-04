# KAOS Cafe HRIS — API Endpoints Reference

Base URL: `/api`  
Auth: All endpoints require `Authorization: Bearer <token>` unless marked **Public**.  
Role guards: `ADMIN` = Admin/Owner, `MANAGER` = Branch Manager, `EMPLOYEE` = Employee.

---

## 0. Authentication

### `POST /api/auth/login` — **Public**
Authenticate user and return JWT token.
```
Request body:
{
  "email": "admin@kaoscafe.com",
  "password": "secret123"
}

Response 200:
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "email": "admin@kaoscafe.com",
    "role": "ADMIN",
    "employee": {
      "id": "uuid",
      "employeeId": "KAOS-0001",
      "firstName": "Grace",
      "lastName": "Santos",
      "branchId": "uuid",
      "profilePhoto": "/uploads/photos/grace.jpg"
    }
  }
}
```

### `POST /api/auth/logout`
Clear auth cookie / invalidate session.
```
Response 200:
{ "message": "Logged out successfully" }
```

### `GET /api/auth/me`
Get currently authenticated user profile.
```
Response 200:
{
  "id": "uuid",
  "email": "admin@kaoscafe.com",
  "role": "ADMIN",
  "employee": {
    "id": "uuid",
    "employeeId": "KAOS-0001",
    "firstName": "Grace",
    "lastName": "Santos",
    "branchId": "uuid",
    "position": "Owner",
    "profilePhoto": "/uploads/photos/grace.jpg"
  }
}
```

---

## 1. Branch Management

**Access:** `ADMIN` only

### `GET /api/branches`
List all branches.
```
Query params:
  ?isActive=true          — filter by active status (optional)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "KAOS Main",
      "address": "123 Coffee St.",
      "city": "Makati",
      "phone": "0917-123-4567",
      "isActive": true,
      "_count": { "employees": 12 },
      "createdAt": "2026-04-04T00:00:00.000Z"
    }
  ],
  "total": 3
}
```

### `GET /api/branches/:id`
Get single branch with employee count.
```
Response 200:
{
  "id": "uuid",
  "name": "KAOS Main",
  "address": "123 Coffee St.",
  "city": "Makati",
  "phone": "0917-123-4567",
  "isActive": true,
  "_count": { "employees": 12 },
  "createdAt": "2026-04-04T00:00:00.000Z",
  "updatedAt": "2026-04-04T00:00:00.000Z"
}
```

### `POST /api/branches`
Create a new branch.
```
Request body:
{
  "name": "KAOS BGC",
  "address": "Unit 5, High Street",
  "city": "Taguig",
  "phone": "0917-999-0000"       // optional
}

Response 201:
{ "id": "uuid", "name": "KAOS BGC", ... }
```

### `PUT /api/branches/:id`
Update branch details.
```
Request body:
{
  "name": "KAOS BGC Updated",    // all fields optional
  "address": "Unit 10, High Street",
  "city": "Taguig",
  "phone": "0917-999-1111",
  "isActive": true
}

Response 200:
{ "id": "uuid", "name": "KAOS BGC Updated", ... }
```

### `DELETE /api/branches/:id`
Soft-delete branch (sets `isActive = false`).
```
Response 200:
{ "message": "Branch deactivated" }
```

---

## 2. Employee Management

**Access:** `ADMIN`, `MANAGER` (own branch only for MANAGER)

### `GET /api/employees`
List employees with filtering and pagination.
```
Query params:
  ?branchId=uuid          — filter by branch
  &status=ACTIVE          — filter by employment status
  &search=santos          — search by name or employeeId
  &page=1                 — pagination (default: 1)
  &limit=20               — items per page (default: 20)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "employeeId": "KAOS-0001",
      "firstName": "Grace",
      "lastName": "Santos",
      "position": "Barista",
      "employmentStatus": "ACTIVE",
      "branch": { "id": "uuid", "name": "KAOS Main" },
      "phone": "0917-123-4567",
      "dateHired": "2025-06-15",
      "profilePhoto": "/uploads/photos/grace.jpg"
    }
  ],
  "total": 45,
  "page": 1,
  "totalPages": 3
}
```

### `GET /api/employees/:id`
Get full employee profile.
```
Response 200:
{
  "id": "uuid",
  "employeeId": "KAOS-0001",
  "firstName": "Grace",
  "lastName": "Santos",
  "middleName": "Cruz",
  "dateOfBirth": "1998-03-15",
  "gender": "Female",
  "civilStatus": "Single",
  "nationality": "Filipino",
  "profilePhoto": "/uploads/photos/grace.jpg",
  "phone": "0917-123-4567",
  "address": "456 Rizal Ave",
  "city": "Makati",
  "province": "Metro Manila",
  "zipCode": "1200",
  "emergencyName": "Maria Santos",
  "emergencyPhone": "0918-222-3333",
  "emergencyRelation": "Mother",
  "position": "Barista",
  "department": "Operations",
  "employmentStatus": "ACTIVE",
  "dateHired": "2025-06-15",
  "dateTerminated": null,
  "basicSalary": "18000.00",
  "sssNumber": "33-1234567-8",
  "philhealthNumber": "12-345678901-2",
  "pagibigNumber": "1234-5678-9012",
  "tinNumber": "123-456-789-000",
  "branch": { "id": "uuid", "name": "KAOS Main" },
  "user": { "id": "uuid", "email": "grace@kaoscafe.com", "role": "EMPLOYEE" },
  "createdAt": "2025-06-15T00:00:00.000Z",
  "updatedAt": "2026-04-01T00:00:00.000Z"
}
```

### `POST /api/employees`
Create a new employee (also creates associated User account).
```
Request body:
{
  "email": "grace@kaoscafe.com",
  "password": "temp1234",
  "role": "EMPLOYEE",
  "branchId": "uuid",
  "firstName": "Grace",
  "lastName": "Santos",
  "middleName": "Cruz",               // optional
  "dateOfBirth": "1998-03-15",         // optional
  "gender": "Female",                  // optional
  "civilStatus": "Single",            // optional
  "phone": "0917-123-4567",           // optional
  "address": "456 Rizal Ave",         // optional
  "city": "Makati",                   // optional
  "province": "Metro Manila",         // optional
  "zipCode": "1200",                  // optional
  "emergencyName": "Maria Santos",    // optional
  "emergencyPhone": "0918-222-3333",  // optional
  "emergencyRelation": "Mother",      // optional
  "position": "Barista",
  "department": "Operations",         // optional
  "dateHired": "2025-06-15",
  "basicSalary": 18000.00,
  "sssNumber": "33-1234567-8",        // optional
  "philhealthNumber": "12-345678901-2", // optional
  "pagibigNumber": "1234-5678-9012",  // optional
  "tinNumber": "123-456-789-000"      // optional
}

Response 201:
{
  "id": "uuid",
  "employeeId": "KAOS-0001",          // auto-generated
  "firstName": "Grace",
  "lastName": "Santos",
  ...
}
```

### `PUT /api/employees/:id`
Update employee profile.
```
Request body:
{
  "firstName": "Grace",               // all fields optional
  "position": "Senior Barista",
  "basicSalary": 20000.00,
  "branchId": "uuid",
  "employmentStatus": "ACTIVE"
}

Response 200:
{ "id": "uuid", "employeeId": "KAOS-0001", ... }
```

### `DELETE /api/employees/:id`
Deactivate employee (sets `employmentStatus = INACTIVE`, `user.isActive = false`).
```
Response 200:
{ "message": "Employee deactivated" }
```

### `POST /api/employees/import`
Bulk import employees via CSV file.
```
Request: multipart/form-data
  file: employees.csv

Response 200:
{
  "imported": 15,
  "failed": 2,
  "errors": [
    { "row": 5, "message": "Missing required field: position" },
    { "row": 12, "message": "Duplicate email: juan@kaoscafe.com" }
  ]
}
```

### `GET /api/employees/import/template`
Download CSV template for bulk import.
```
Response 200: text/csv
  (file download: employee_import_template.csv)
```

---

## 3. Shift Scheduling

**Access:** `ADMIN`, `MANAGER` (own branch only)

### `GET /api/scheduling/shifts`
List shifts by branch and date range (for calendar view).
```
Query params:
  ?branchId=uuid          — required
  &from=2026-04-01        — start date (required)
  &to=2026-04-30          — end date (required)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "branchId": "uuid",
      "name": "Morning Shift",
      "date": "2026-04-10",
      "startTime": "06:00",
      "endTime": "14:00",
      "status": "PUBLISHED",
      "assignments": [
        {
          "id": "uuid",
          "employee": {
            "id": "uuid",
            "employeeId": "KAOS-0001",
            "firstName": "Grace",
            "lastName": "Santos",
            "profilePhoto": "/uploads/photos/grace.jpg"
          }
        }
      ]
    }
  ]
}
```

### `POST /api/scheduling/shifts`
Create a new shift.
```
Request body:
{
  "branchId": "uuid",
  "name": "Morning Shift",
  "date": "2026-04-10",
  "startTime": "06:00",
  "endTime": "14:00"
}

Response 201:
{ "id": "uuid", "name": "Morning Shift", "status": "DRAFT", ... }
```

### `PUT /api/scheduling/shifts/:id`
Update shift details (only if DRAFT).
```
Request body:
{
  "name": "Early Morning Shift",      // all fields optional
  "startTime": "05:00",
  "endTime": "13:00"
}

Response 200:
{ "id": "uuid", "name": "Early Morning Shift", ... }
```

### `DELETE /api/scheduling/shifts/:id`
Delete a shift (only if DRAFT).
```
Response 200:
{ "message": "Shift deleted" }
```

### `POST /api/scheduling/shifts/:id/assignments`
Assign employees to a shift (drag-and-drop target).
```
Request body:
{
  "employeeIds": ["uuid-1", "uuid-2", "uuid-3"]
}

Response 200:
{
  "assigned": 3,
  "assignments": [
    { "id": "uuid", "employeeId": "uuid-1", "shiftId": "uuid" },
    { "id": "uuid", "employeeId": "uuid-2", "shiftId": "uuid" },
    { "id": "uuid", "employeeId": "uuid-3", "shiftId": "uuid" }
  ]
}
```

### `DELETE /api/scheduling/shifts/:shiftId/assignments/:employeeId`
Remove employee from a shift.
```
Response 200:
{ "message": "Assignment removed" }
```

### `PATCH /api/scheduling/shifts/:id/publish`
Publish a draft shift (makes it visible to employees).
```
Response 200:
{ "id": "uuid", "status": "PUBLISHED", ... }
```

### `POST /api/scheduling/shifts/bulk`
Create multiple shifts at once (for weekly template).
```
Request body:
{
  "branchId": "uuid",
  "shifts": [
    { "name": "Morning Shift", "date": "2026-04-10", "startTime": "06:00", "endTime": "14:00" },
    { "name": "Closing Shift", "date": "2026-04-10", "startTime": "14:00", "endTime": "22:00" }
  ]
}

Response 201:
{ "created": 2, "data": [ ... ] }
```

---

## 4. Attendance (Selfie + Kiosk + Offline Sync)

**Access:** `ADMIN`, `MANAGER` for viewing; kiosk endpoints use device auth

### `POST /api/attendance/clock-in`
Employee clocks in via kiosk tablet.
```
Request: multipart/form-data
  employeeId: "KAOS-0001"          // human-readable employee ID
  branchId: "uuid"
  selfie: (binary file)            // selfie capture from tablet camera
  deviceId: "KIOSK-MAIN-01"       // optional, identifies the tablet
  localRecordId: "local-uuid"     // optional, client-generated ID for offline dedup

Response 201:
{
  "id": "uuid",
  "employeeId": "uuid",
  "clockIn": "2026-04-04T06:02:00.000Z",
  "status": "PRESENT",
  "selfieIn": "/uploads/selfies/2026-04-04/kaos0001-in.jpg",
  "lateMinutes": 2
}
```

### `POST /api/attendance/clock-out`
Employee clocks out via kiosk tablet.
```
Request: multipart/form-data
  employeeId: "KAOS-0001"
  branchId: "uuid"
  selfie: (binary file)
  deviceId: "KIOSK-MAIN-01"       // optional

Response 200:
{
  "id": "uuid",
  "clockIn": "2026-04-04T06:02:00.000Z",
  "clockOut": "2026-04-04T14:05:00.000Z",
  "selfieOut": "/uploads/selfies/2026-04-04/kaos0001-out.jpg",
  "hoursWorked": "8.05",
  "overtimeHours": "0.05",
  "undertimeMinutes": 0
}
```

### `POST /api/attendance/sync`
Batch sync offline attendance records from kiosk.
```
Request body:
{
  "deviceId": "KIOSK-MAIN-01",
  "records": [
    {
      "localRecordId": "local-uuid-1",
      "employeeId": "KAOS-0001",
      "branchId": "uuid",
      "clockIn": "2026-04-03T06:00:00.000Z",
      "clockOut": "2026-04-03T14:00:00.000Z",
      "selfieIn": "base64-encoded-string",
      "selfieOut": "base64-encoded-string"
    },
    {
      "localRecordId": "local-uuid-2",
      "employeeId": "KAOS-0002",
      "branchId": "uuid",
      "clockIn": "2026-04-03T06:05:00.000Z",
      "clockOut": null,
      "selfieIn": "base64-encoded-string",
      "selfieOut": null
    }
  ]
}

Response 200:
{
  "synced": 2,
  "duplicates": 0,
  "failed": 0,
  "results": [
    { "localRecordId": "local-uuid-1", "status": "SYNCED", "serverId": "uuid" },
    { "localRecordId": "local-uuid-2", "status": "SYNCED", "serverId": "uuid" }
  ]
}
```

### `GET /api/attendance`
List attendance records (admin/manager view).
```
Query params:
  ?branchId=uuid          — filter by branch (required for MANAGER)
  &date=2026-04-04        — single date
  &from=2026-04-01        — date range start
  &to=2026-04-30          — date range end
  &status=LATE            — filter by status
  &employeeId=uuid        — filter by employee
  &page=1
  &limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-04-04",
      "clockIn": "2026-04-04T06:02:00.000Z",
      "clockOut": "2026-04-04T14:05:00.000Z",
      "status": "PRESENT",
      "selfieIn": "/uploads/selfies/2026-04-04/kaos0001-in.jpg",
      "selfieOut": "/uploads/selfies/2026-04-04/kaos0001-out.jpg",
      "hoursWorked": "8.05",
      "overtimeHours": "0.05",
      "lateMinutes": 2,
      "undertimeMinutes": 0,
      "syncStatus": "SYNCED",
      "employee": {
        "id": "uuid",
        "employeeId": "KAOS-0001",
        "firstName": "Grace",
        "lastName": "Santos"
      },
      "branch": { "id": "uuid", "name": "KAOS Main" }
    }
  ],
  "total": 120,
  "page": 1,
  "totalPages": 6
}
```

### `GET /api/attendance/:id`
Get single attendance record detail.
```
Response 200:
{
  "id": "uuid",
  "date": "2026-04-04",
  "clockIn": "2026-04-04T06:02:00.000Z",
  "clockOut": "2026-04-04T14:05:00.000Z",
  "status": "PRESENT",
  "selfieIn": "/uploads/selfies/...",
  "selfieOut": "/uploads/selfies/...",
  "hoursWorked": "8.05",
  "overtimeHours": "0.05",
  "lateMinutes": 2,
  "undertimeMinutes": 0,
  "syncStatus": "SYNCED",
  "deviceId": "KIOSK-MAIN-01",
  "remarks": null,
  "employee": { ... },
  "branch": { ... }
}
```

### `PUT /api/attendance/:id`
Manually correct an attendance record (admin override).
```
Request body:
{
  "clockIn": "2026-04-04T06:00:00.000Z",  // optional
  "clockOut": "2026-04-04T14:00:00.000Z",  // optional
  "status": "PRESENT",                     // optional
  "remarks": "Corrected by admin — kiosk clock was off"  // optional
}

Response 200:
{ "id": "uuid", "status": "PRESENT", "remarks": "Corrected by admin...", ... }
```

---

## 5. Leave Management

**Access:** `ADMIN`, `MANAGER` for review; `EMPLOYEE` for own requests

### `GET /api/leave/requests`
List leave requests.
```
Query params:
  ?branchId=uuid          — filter by branch
  &employeeId=uuid        — filter by employee
  &status=PENDING         — filter by status
  &from=2026-04-01        — date range
  &to=2026-04-30
  &page=1
  &limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "leaveType": "VACATION",
      "startDate": "2026-04-15",
      "endDate": "2026-04-17",
      "totalDays": "3.0",
      "reason": "Family trip",
      "status": "PENDING",
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNotes": null,
      "employee": {
        "id": "uuid",
        "employeeId": "KAOS-0001",
        "firstName": "Grace",
        "lastName": "Santos",
        "branch": { "id": "uuid", "name": "KAOS Main" }
      },
      "createdAt": "2026-04-04T08:00:00.000Z"
    }
  ],
  "total": 8,
  "page": 1,
  "totalPages": 1
}
```

### `GET /api/leave/requests/:id`
Get single leave request detail.
```
Response 200:
{
  "id": "uuid",
  "leaveType": "VACATION",
  "startDate": "2026-04-15",
  "endDate": "2026-04-17",
  "totalDays": "3.0",
  "reason": "Family trip",
  "status": "PENDING",
  "reviewedBy": null,
  "reviewedAt": null,
  "reviewNotes": null,
  "employee": { ... },
  "createdAt": "2026-04-04T08:00:00.000Z"
}
```

### `POST /api/leave/requests`
Submit a new leave request. `EMPLOYEE` can only submit for self.
```
Request body:
{
  "employeeId": "uuid",
  "leaveType": "VACATION",
  "startDate": "2026-04-15",
  "endDate": "2026-04-17",
  "totalDays": 3.0,
  "reason": "Family trip"             // optional
}

Response 201:
{ "id": "uuid", "status": "PENDING", ... }
```

### `PATCH /api/leave/requests/:id/review`
Approve or reject a leave request. `ADMIN` / `MANAGER` only.
```
Request body:
{
  "status": "APPROVED",               // "APPROVED" | "REJECTED"
  "reviewNotes": "Approved. Enjoy!"   // optional
}

Response 200:
{
  "id": "uuid",
  "status": "APPROVED",
  "reviewedBy": "uuid",
  "reviewedAt": "2026-04-05T10:30:00.000Z",
  "reviewNotes": "Approved. Enjoy!"
}
```

### `PATCH /api/leave/requests/:id/cancel`
Cancel a pending leave request. `EMPLOYEE` (own) or `ADMIN`.
```
Response 200:
{ "id": "uuid", "status": "CANCELLED" }
```

### `GET /api/leave/balances/:employeeId`
Get leave balances for an employee.
```
Query params:
  ?year=2026              — calendar year (default: current year)

Response 200:
{
  "employeeId": "uuid",
  "year": 2026,
  "balances": [
    { "leaveType": "VACATION", "totalDays": "15.0", "usedDays": "3.0", "remainingDays": "12.0" },
    { "leaveType": "SICK", "totalDays": "10.0", "usedDays": "1.0", "remainingDays": "9.0" },
    { "leaveType": "EMERGENCY", "totalDays": "3.0", "usedDays": "0.0", "remainingDays": "3.0" }
  ]
}
```

### `PUT /api/leave/balances/:employeeId`
Set/update leave balances for an employee. `ADMIN` only.
```
Request body:
{
  "year": 2026,
  "balances": [
    { "leaveType": "VACATION", "totalDays": 15 },
    { "leaveType": "SICK", "totalDays": 10 },
    { "leaveType": "EMERGENCY", "totalDays": 3 }
  ]
}

Response 200:
{ "message": "Leave balances updated", "balances": [ ... ] }
```

---

## 6. Payroll Processing

**Access:** `ADMIN` only

### `GET /api/payroll/runs`
List payroll runs.
```
Query params:
  ?branchId=uuid          — filter by branch
  &status=COMPLETED       — filter by status
  &year=2026              — filter by year
  &page=1
  &limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "branch": { "id": "uuid", "name": "KAOS Main" },
      "periodStart": "2026-04-01",
      "periodEnd": "2026-04-15",
      "status": "COMPLETED",
      "processedBy": "uuid",
      "processedAt": "2026-04-16T08:00:00.000Z",
      "_count": { "payslips": 12 },
      "createdAt": "2026-04-15T00:00:00.000Z"
    }
  ],
  "total": 6,
  "page": 1,
  "totalPages": 1
}
```

### `POST /api/payroll/runs`
Create a new payroll run for a branch + period.
```
Request body:
{
  "branchId": "uuid",
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-15"
}

Response 201:
{ "id": "uuid", "status": "DRAFT", ... }
```

### `GET /api/payroll/runs/:id`
Get payroll run details with all payslip summaries.
```
Response 200:
{
  "id": "uuid",
  "branch": { "id": "uuid", "name": "KAOS Main" },
  "periodStart": "2026-04-01",
  "periodEnd": "2026-04-15",
  "status": "COMPLETED",
  "processedBy": "uuid",
  "processedAt": "2026-04-16T08:00:00.000Z",
  "payslips": [
    {
      "id": "uuid",
      "employee": {
        "id": "uuid",
        "employeeId": "KAOS-0001",
        "firstName": "Grace",
        "lastName": "Santos"
      },
      "basicPay": "9000.00",
      "grossPay": "9500.00",
      "totalDeductions": "1250.00",
      "netPay": "8250.00",
      "status": "FINALIZED"
    }
  ]
}
```

### `POST /api/payroll/runs/:id/process`
Compute all payslips for a payroll run (attendance-based calculation).
Pulls attendance data, applies deductions/earnings, computes gov contributions.
```
Response 200:
{
  "message": "Payroll processed",
  "payrollRunId": "uuid",
  "status": "PROCESSING",
  "payslipsGenerated": 12
}
```

### `PATCH /api/payroll/runs/:id/complete`
Finalize payroll run — locks all payslips, marks run as COMPLETED.
```
Response 200:
{ "id": "uuid", "status": "COMPLETED", ... }
```

### `DELETE /api/payroll/runs/:id`
Cancel a DRAFT payroll run.
```
Response 200:
{ "message": "Payroll run cancelled" }
```

### `GET /api/payroll/payslips/:id`
Get full payslip detail with itemized earnings and deductions.
```
Response 200:
{
  "id": "uuid",
  "payrollRun": {
    "id": "uuid",
    "periodStart": "2026-04-01",
    "periodEnd": "2026-04-15",
    "branch": { "id": "uuid", "name": "KAOS Main" }
  },
  "employee": {
    "id": "uuid",
    "employeeId": "KAOS-0001",
    "firstName": "Grace",
    "lastName": "Santos",
    "position": "Barista"
  },
  "basicPay": "9000.00",
  "overtimePay": "375.00",
  "bonuses": "0.00",
  "allowances": "125.00",
  "holidayPay": "0.00",
  "grossPay": "9500.00",
  "sssContribution": "450.00",
  "philhealthContribution": "225.00",
  "pagibigContribution": "100.00",
  "withholdingTax": "275.00",
  "lateDeductions": "100.00",
  "cashAdvance": "0.00",
  "salaryLoan": "0.00",
  "otherDeductions": "100.00",
  "totalDeductions": "1250.00",
  "netPay": "8250.00",
  "status": "FINALIZED",
  "pdfUrl": "/uploads/payslips/2026-04/KAOS-0001-apr-1.pdf",
  "earnings": [
    { "id": "uuid", "type": "OVERTIME", "label": "Overtime (5 hrs)", "amount": "375.00" },
    { "id": "uuid", "type": "ALLOWANCE", "label": "Meal Allowance", "amount": "125.00" }
  ],
  "deductions": [
    { "id": "uuid", "type": "SSS", "label": "SSS Contribution", "amount": "450.00" },
    { "id": "uuid", "type": "PHILHEALTH", "label": "PhilHealth Contribution", "amount": "225.00" },
    { "id": "uuid", "type": "PAGIBIG", "label": "Pag-IBIG Contribution", "amount": "100.00" },
    { "id": "uuid", "type": "BIR_TAX", "label": "Withholding Tax", "amount": "275.00" },
    { "id": "uuid", "type": "LATE", "label": "Late Deductions (30 min)", "amount": "100.00" },
    { "id": "uuid", "type": "OTHER", "label": "Uniform Deduction", "amount": "100.00" }
  ]
}
```

### `PUT /api/payroll/payslips/:id`
Manually adjust a payslip (before finalization).
```
Request body:
{
  "bonuses": 500.00,                  // optional — override any field
  "allowances": 200.00,
  "cashAdvance": 1000.00,
  "otherDeductions": 0,
  "earnings": [                        // optional — replace itemized earnings
    { "type": "BONUS", "label": "Performance Bonus", "amount": 500.00 }
  ],
  "deductions": [                      // optional — add extra deductions
    { "type": "CASH_ADVANCE", "label": "Cash Advance - Apr", "amount": 1000.00 }
  ]
}

Response 200:
{ "id": "uuid", "grossPay": "10000.00", "netPay": "8500.00", ... }
```

### `GET /api/payroll/payslips/:id/pdf`
Download payslip as PDF.
```
Response 200: application/pdf
  (file download: KAOS-0001-apr-2026-1st.pdf)
```

---

## 7. Reports & Analytics

**Access:** `ADMIN`, `MANAGER` (own branch only)

### `GET /api/reports/attendance`
Attendance summary report.
```
Query params:
  ?branchId=uuid          — filter by branch (required for MANAGER)
  &from=2026-04-01        — required
  &to=2026-04-30          — required

Response 200:
{
  "period": { "from": "2026-04-01", "to": "2026-04-30" },
  "branch": { "id": "uuid", "name": "KAOS Main" },
  "summary": {
    "totalWorkingDays": 22,
    "totalPresent": 240,
    "totalLate": 18,
    "totalAbsent": 6,
    "totalHalfDay": 2,
    "averageHoursPerDay": "7.85",
    "totalOvertimeHours": "42.50"
  },
  "byEmployee": [
    {
      "employeeId": "KAOS-0001",
      "firstName": "Grace",
      "lastName": "Santos",
      "present": 21,
      "late": 1,
      "absent": 0,
      "totalHours": "172.50",
      "overtimeHours": "4.50",
      "totalLateMinutes": 12
    }
  ]
}
```

### `GET /api/reports/payroll`
Payroll summary report.
```
Query params:
  ?branchId=uuid          — filter by branch
  &from=2026-01-01        — required
  &to=2026-04-30          — required

Response 200:
{
  "period": { "from": "2026-01-01", "to": "2026-04-30" },
  "branch": { "id": "uuid", "name": "KAOS Main" },
  "summary": {
    "totalGrossPay": "850000.00",
    "totalNetPay": "720000.00",
    "totalDeductions": "130000.00",
    "totalSSS": "35000.00",
    "totalPhilHealth": "18000.00",
    "totalPagIBIG": "8000.00",
    "totalTax": "22000.00",
    "totalOvertimePay": "15000.00",
    "payrollRunsCount": 8
  },
  "byPeriod": [
    {
      "periodStart": "2026-04-01",
      "periodEnd": "2026-04-15",
      "totalGrossPay": "110000.00",
      "totalNetPay": "93000.00",
      "totalDeductions": "17000.00",
      "employeeCount": 12
    }
  ]
}
```

### `GET /api/reports/headcount`
Headcount report across branches.
```
Query params:
  ?branchId=uuid          — optional, omit for all branches

Response 200:
{
  "totalEmployees": 45,
  "byStatus": {
    "ACTIVE": 40,
    "INACTIVE": 3,
    "ON_LEAVE": 2,
    "TERMINATED": 0
  },
  "byBranch": [
    {
      "branch": { "id": "uuid", "name": "KAOS Main" },
      "total": 15,
      "active": 14,
      "inactive": 1
    },
    {
      "branch": { "id": "uuid", "name": "KAOS BGC" },
      "total": 12,
      "active": 11,
      "inactive": 0
    }
  ],
  "byPosition": [
    { "position": "Barista", "count": 20 },
    { "position": "Cashier", "count": 10 },
    { "position": "Branch Manager", "count": 3 }
  ]
}
```

### `GET /api/reports/export/:type`
Export report as Excel or PDF.
```
Query params:
  ?format=excel           — "excel" | "pdf"
  &branchId=uuid
  &from=2026-04-01
  &to=2026-04-30

:type = "attendance" | "payroll" | "headcount"

Response 200: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  OR application/pdf
  (file download)
```

---

## 8. Employee Portal

**Access:** `EMPLOYEE` (own data only, scoped by authenticated user)

### `GET /api/portal/profile`
Get own employee profile.
```
Response 200:
{
  "id": "uuid",
  "employeeId": "KAOS-0001",
  "firstName": "Grace",
  "lastName": "Santos",
  "email": "grace@kaoscafe.com",
  "phone": "0917-123-4567",
  "address": "456 Rizal Ave",
  "city": "Makati",
  "province": "Metro Manila",
  "zipCode": "1200",
  "emergencyName": "Maria Santos",
  "emergencyPhone": "0918-222-3333",
  "emergencyRelation": "Mother",
  "position": "Barista",
  "department": "Operations",
  "branch": { "id": "uuid", "name": "KAOS Main" },
  "dateHired": "2025-06-15",
  "profilePhoto": "/uploads/photos/grace.jpg"
}
```

### `PUT /api/portal/profile`
Update own profile (limited fields).
```
Request body:
{
  "phone": "0917-999-8888",           // optional
  "address": "789 New Address",       // optional
  "city": "BGC",                      // optional
  "province": "Metro Manila",         // optional
  "zipCode": "1634",                  // optional
  "emergencyName": "Pedro Santos",    // optional
  "emergencyPhone": "0918-111-2222",  // optional
  "emergencyRelation": "Father"       // optional
}

Response 200:
{ "message": "Profile updated", ... }
```

### `POST /api/portal/profile/photo`
Upload/update profile photo.
```
Request: multipart/form-data
  photo: (binary file)

Response 200:
{ "profilePhoto": "/uploads/photos/grace-new.jpg" }
```

### `PUT /api/portal/password`
Change own password.
```
Request body:
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}

Response 200:
{ "message": "Password updated" }
```

### `GET /api/portal/schedule`
Get own shift schedule.
```
Query params:
  ?from=2026-04-01        — default: current week start
  &to=2026-04-30          — default: current week end
  &view=monthly           — "daily" | "weekly" | "monthly" (default: weekly)

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-04-10",
      "name": "Morning Shift",
      "startTime": "06:00",
      "endTime": "14:00",
      "branch": { "id": "uuid", "name": "KAOS Main" }
    }
  ]
}
```

### `GET /api/portal/attendance`
Get own attendance history.
```
Query params:
  ?from=2026-04-01        — default: current month start
  &to=2026-04-30          — default: current month end
  &page=1
  &limit=31

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "date": "2026-04-04",
      "clockIn": "2026-04-04T06:02:00.000Z",
      "clockOut": "2026-04-04T14:05:00.000Z",
      "status": "PRESENT",
      "hoursWorked": "8.05",
      "lateMinutes": 2,
      "overtimeHours": "0.05"
    }
  ],
  "summary": {
    "present": 3,
    "late": 1,
    "absent": 0,
    "totalHours": "24.15"
  },
  "total": 4,
  "page": 1,
  "totalPages": 1
}
```

### `GET /api/portal/payslips`
List own payslips.
```
Query params:
  ?year=2026              — default: current year

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "periodStart": "2026-04-01",
      "periodEnd": "2026-04-15",
      "grossPay": "9500.00",
      "totalDeductions": "1250.00",
      "netPay": "8250.00",
      "status": "FINALIZED",
      "pdfUrl": "/uploads/payslips/2026-04/KAOS-0001-apr-1.pdf"
    }
  ]
}
```

### `GET /api/portal/payslips/:id`
Get own payslip detail (same shape as admin payslip detail).
```
Response 200:
{ ... }  // same as GET /api/payroll/payslips/:id
```

### `GET /api/portal/payslips/:id/pdf`
Download own payslip PDF.
```
Response 200: application/pdf
```

### `GET /api/portal/leave`
List own leave requests.
```
Query params:
  ?status=PENDING
  &year=2026

Response 200:
{
  "requests": [
    {
      "id": "uuid",
      "leaveType": "VACATION",
      "startDate": "2026-04-15",
      "endDate": "2026-04-17",
      "totalDays": "3.0",
      "reason": "Family trip",
      "status": "APPROVED",
      "reviewNotes": "Approved. Enjoy!",
      "createdAt": "2026-04-04T08:00:00.000Z"
    }
  ],
  "balances": [
    { "leaveType": "VACATION", "totalDays": "15.0", "usedDays": "3.0", "remainingDays": "12.0" },
    { "leaveType": "SICK", "totalDays": "10.0", "usedDays": "0.0", "remainingDays": "10.0" }
  ]
}
```

### `POST /api/portal/leave`
Submit own leave request (shortcut — delegates to `POST /api/leave/requests`).
```
Request body:
{
  "leaveType": "VACATION",
  "startDate": "2026-04-15",
  "endDate": "2026-04-17",
  "totalDays": 3.0,
  "reason": "Family trip"
}

Response 201:
{ "id": "uuid", "status": "PENDING", ... }
```

### `PATCH /api/portal/leave/:id/cancel`
Cancel own pending leave request.
```
Response 200:
{ "id": "uuid", "status": "CANCELLED" }
```

---

## 9. System Settings

**Access:** `ADMIN` only

### `GET /api/settings`
List all system settings, optionally grouped.
```
Query params:
  ?group=payroll          — filter by group (optional)

Response 200:
{
  "data": [
    { "id": "uuid", "key": "overtime_rate_multiplier", "value": "1.25", "group": "payroll" },
    { "id": "uuid", "key": "late_deduction_per_minute", "value": "5.00", "group": "payroll" },
    { "id": "uuid", "key": "company_name", "value": "\"KAOS Cafe\"", "group": "company" },
    { "id": "uuid", "key": "company_address", "value": "\"123 Main St\"", "group": "company" },
    { "id": "uuid", "key": "working_hours_per_day", "value": "8", "group": "attendance" }
  ]
}
```

### `PUT /api/settings/:key`
Update a single system setting.
```
Request body:
{
  "value": "1.50",
  "group": "payroll"                   // optional
}

Response 200:
{ "key": "overtime_rate_multiplier", "value": "1.50", "group": "payroll" }
```

### `PUT /api/settings`
Bulk update multiple settings.
```
Request body:
{
  "settings": [
    { "key": "overtime_rate_multiplier", "value": "1.50" },
    { "key": "late_deduction_per_minute", "value": "3.00" }
  ]
}

Response 200:
{ "updated": 2 }
```

### `GET /api/settings/government-tables`
List government contribution tables.
```
Query params:
  ?type=SSS               — "SSS" | "PHILHEALTH" | "PAGIBIG" | "BIR"

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "type": "SSS",
      "rangeFrom": "0.00",
      "rangeTo": "4249.99",
      "employeeShare": "180.00",
      "employerShare": "390.00",
      "effectiveDate": "2025-01-01"
    },
    {
      "id": "uuid",
      "type": "SSS",
      "rangeFrom": "4250.00",
      "rangeTo": "4749.99",
      "employeeShare": "202.50",
      "employerShare": "437.50",
      "effectiveDate": "2025-01-01"
    }
  ]
}
```

### `POST /api/settings/government-tables`
Create or replace government contribution table entries.
```
Request body:
{
  "type": "SSS",
  "effectiveDate": "2026-01-01",
  "entries": [
    { "rangeFrom": 0, "rangeTo": 4249.99, "employeeShare": 180, "employerShare": 390 },
    { "rangeFrom": 4250, "rangeTo": 4749.99, "employeeShare": 202.50, "employerShare": 437.50 }
  ]
}

Response 201:
{ "type": "SSS", "effectiveDate": "2026-01-01", "entriesCreated": 2 }
```

### `DELETE /api/settings/government-tables/:id`
Delete a single government table entry.
```
Response 200:
{ "message": "Entry deleted" }
```

---

## 10. Audit Logs

**Access:** `ADMIN` only

### `GET /api/audit-logs`
Query system audit trail.
```
Query params:
  ?tableName=employees    — filter by affected table
  &action=UPDATE          — filter by action type
  &userId=uuid            — filter by who made the change
  &recordId=uuid          — filter by affected record
  &from=2026-04-01        — date range
  &to=2026-04-30
  &page=1
  &limit=50

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "action": "UPDATE",
      "tableName": "employees",
      "recordId": "uuid",
      "oldValues": { "position": "Barista" },
      "newValues": { "position": "Senior Barista" },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "user": {
        "id": "uuid",
        "email": "admin@kaoscafe.com"
      },
      "createdAt": "2026-04-04T09:15:00.000Z"
    }
  ],
  "total": 340,
  "page": 1,
  "totalPages": 7
}
```

### `GET /api/audit-logs/:id`
Get single audit log entry.
```
Response 200:
{
  "id": "uuid",
  "action": "UPDATE",
  "tableName": "employees",
  "recordId": "uuid",
  "oldValues": { "position": "Barista", "basicSalary": "18000.00" },
  "newValues": { "position": "Senior Barista", "basicSalary": "20000.00" },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "user": { "id": "uuid", "email": "admin@kaoscafe.com" },
  "createdAt": "2026-04-04T09:15:00.000Z"
}
```

---

## Error Response Format

All errors follow a consistent shape:

```json
// 400 Validation Error
{
  "message": "Validation failed",
  "errors": {
    "email": ["Email is required"],
    "branchId": ["Invalid branch ID"]
  }
}

// 401 Unauthorized
{ "message": "Authentication required" }

// 403 Forbidden
{ "message": "Insufficient permissions" }

// 404 Not Found
{ "message": "Employee not found" }

// 409 Conflict
{ "message": "Employee already clocked in today" }

// 500 Internal Server Error
{ "message": "Internal server error" }
```

---

## Summary Table

| # | Module               | Endpoints | Methods                        |
|---|----------------------|-----------|--------------------------------|
| 0 | Auth                 | 3         | POST, POST, GET                |
| 1 | Branches             | 5         | GET, GET, POST, PUT, DELETE    |
| 2 | Employees            | 7         | GET, GET, POST, PUT, DELETE, POST, GET |
| 3 | Shift Scheduling     | 8         | GET, POST, PUT, DELETE, POST, DELETE, PATCH, POST |
| 4 | Attendance           | 6         | POST, POST, POST, GET, GET, PUT |
| 5 | Leave Management     | 7         | GET, GET, POST, PATCH, PATCH, GET, PUT |
| 6 | Payroll Processing   | 8         | GET, POST, GET, POST, PATCH, DELETE, GET, PUT, GET |
| 7 | Reports & Analytics  | 4         | GET, GET, GET, GET             |
| 8 | Employee Portal      | 13        | GET, PUT, POST, PUT, GET, GET, GET, GET, GET, POST, PATCH, GET, GET |
| 9 | System Settings      | 5         | GET, PUT, PUT, GET, POST, DELETE |
| 10| Audit Logs           | 2         | GET, GET                       |
|   | **Total**            | **68**    |                                |
