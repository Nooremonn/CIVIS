# CIVIS Backend (Mobile App API) - Phase 2

## Run
1. `npm install`
2. Copy new lines from `.env.example` into your `.env`
3. `npm run dev`

## Endpoints
POST  /auth/register        { name, email, password, phone? }  -> sends OTP
POST  /auth/verify-otp      { email, otp }                     -> returns token
POST  /auth/resend-otp      { email }
POST  /auth/login           { email, password }                -> returns token (verified users only)

GET   /users/me             (token)
PATCH /users/me             (token)
POST  /users/location       (token)
POST  /users/fcm-token      (token)

POST  /reports              (token) form-data: image, latitude, longitude, capturedAt?, clientId?, description?
GET   /reports/my           (token) ?status=Pending&page=1&limit=20
GET   /reports/:id          (token)
