# API Documentation

## Base URL

```
http://localhost:3000/api
```

## Endpoints

### Health Check

```
GET /health
```

Response:
```json
{ "status": "ok", "timestamp": "2026-07-28T12:00:00.000Z" }
```

---

### Get All Applications

```
GET /applications
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "companyName": "Google",
      "jobRole": "Software Engineer Intern",
      "applicationLink": "https://careers.google.com/...",
      "applicantEmail": "abc@gmail.com",
      "portalName": "Google Careers",
      "status": "Applied",
      "appliedDate": "28 July 2026",
      "appliedTime": "9:43 PM",
      "createdAt": "2026-07-28T16:13:00.000Z",
      "updatedAt": "2026-07-28T16:13:00.000Z"
    }
  ]
}
```

---

### Get Application By ID

```
GET /application/:id
```

---

### Create Application

```
POST /application
Content-Type: application/json
```

Body:
```json
{
  "companyName": "Google",
  "jobRole": "Software Engineer Intern",
  "applicationLink": "https://careers.google.com/...",
  "applicantEmail": "abc@gmail.com",
  "portalName": "Google Careers",
  "appliedDate": "28 July 2026",
  "appliedTime": "9:43 PM"
}
```

All fields are required. Status defaults to "Applied".

---

### Update Application

```
PUT /application/:id
Content-Type: application/json
```

Body (partial):
```json
{
  "status": "Interview Scheduled"
}
```

---

### Delete Application

```
DELETE /application/:id
```

Returns `204 No Content` on success.

---

### Export CSV

```
GET /exports/csv
```

Downloads a CSV file with all application data.
