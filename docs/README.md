# HR Management API Docs

This folder contains project documentation for the HR Management API.

## Documents

- [`api-reference.md`](./api-reference.md)
  Full module-by-module API reference. Explains the purpose of each module and what every exposed API does.

## Quick Notes

- Base API path: `/api/v1`
- Swagger UI: `/api/docs`
- Success response shape:

```json
{
  "isSuccess": true,
  "message": "Optional success message",
  "data": {}
}
```

- Error response shape:

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
