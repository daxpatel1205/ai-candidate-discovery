# PAL.md - Authentication & User Management Implementation Plan

# AI Candidate Discovery Platform

## Module

Authentication & Authorization

**Priority:** Critical (Phase 1)

**Status:** Planned

---

# Objective

Build a secure, production-ready authentication system with email OTP verification, JWT authentication, role-based access control, and persistent login sessions.

---

# Tech Stack

Frontend

* React 18
* React Router
* React Context
* Axios

Backend

* Node.js
* Express.js

Database

* MongoDB
* Mongoose

Authentication

* JWT Access Token
* JWT Refresh Token
* bcrypt

Email

* Nodemailer (SMTP provider)

Validation

* express-validator

Security

* Helmet
* Rate Limiting
* CORS
* HTTP-only Cookies (recommended)
* Password Hashing
* Input Sanitization

---

# User Roles

* Admin
* Recruiter
* Candidate

Role permissions must be enforced on both the frontend and backend.

---

# Authentication Flow

## Step 1 - User Registration

User enters:

* Full Name
* Email
* Password
* Confirm Password
* Role

System validates:

* Required fields
* Email format
* Password strength
* Password confirmation
* Duplicate email check

If validation passes:

* Hash password using bcrypt.
* Generate a 6-digit OTP.
* Save the OTP with an expiration time.
* Mark account as `isVerified = false`.
* Send the OTP to the user's email.
* Redirect to the OTP verification screen.

---

## Step 2 - Email OTP Verification

User enters the OTP.

System checks:

* Correct OTP
* Not expired
* Maximum retry limit

If valid:

* Mark `isVerified = true`.
* Clear the stored OTP.
* Allow the user to log in.

If invalid:

* Show an error.
* Allow retry within the configured limit.

---

## Step 3 - Login

User provides:

* Email
* Password

System verifies:

* Email exists
* Password matches
* Email is verified
* Account is active

On success:

* Generate JWT Access Token.
* Generate Refresh Token.
* Store Refresh Token securely.
* Return authenticated user data.
* Redirect to the appropriate dashboard.

---

## Step 4 - Remember Me

If the user selects "Remember Me":

* Keep the session active for a longer period.
* Refresh tokens automatically before expiration.
* Restore the session when the user revisits the application.

If not selected:

* Use a shorter session lifetime.

---

## Step 5 - Forgot Password

User enters email.

System:

* Generates a password reset OTP.
* Sends the OTP via email.
* Verifies the OTP.
* Allows the user to create a new password.
* Invalidates the OTP after use or expiry.

---

## Step 6 - Logout

Logout must:

* Invalidate the refresh token.
* Clear authentication cookies or local storage.
* Clear cached user data.
* Redirect to the login page.

---

# Security Requirements

* Passwords stored only as bcrypt hashes.
* OTP expires after a short configurable duration.
* Limit OTP verification attempts.
* Rate-limit login, signup, and OTP endpoints.
* Validate and sanitize all input.
* Never expose passwords, OTPs, or secrets in API responses.
* Store secrets in environment variables.
* Enable Helmet and CORS.
* Log authentication events without logging sensitive data.

---

# API Endpoints

Authentication

POST /api/auth/register

POST /api/auth/verify-email

POST /api/auth/resend-otp

POST /api/auth/login

POST /api/auth/refresh-token

POST /api/auth/forgot-password

POST /api/auth/verify-reset-otp

POST /api/auth/reset-password

POST /api/auth/logout

GET /api/auth/me

---

# Database Schema

## User

* Full Name
* Email
* Password Hash
* Role
* Email Verified
* Account Status
* Created At
* Updated At

## OTP Verification

* User ID
* OTP
* Purpose (Email Verification / Password Reset)
* Expiration Time
* Attempt Count
* Created At

## Refresh Token

* User ID
* Token Hash
* Device Information (optional)
* IP Address (optional)
* Expiration Time

---

# Frontend Pages

* Login
* Register
* Verify Email OTP
* Forgot Password
* Verify Reset OTP
* Reset Password
* Unauthorized
* Profile
* Account Settings

---

# User Experience

* Real-time form validation.
* Password strength indicator.
* Show/hide password toggle.
* Loading indicators during requests.
* Countdown timer before OTP resend.
* Toast notifications for success and error states.
* Responsive design for mobile, tablet, and desktop.

---

# Acceptance Criteria

* Users cannot log in until their email is verified.
* OTP is required for new account activation.
* Passwords are securely hashed.
* Refresh tokens maintain authenticated sessions.
* "Remember Me" works correctly.
* Forgot password flow uses OTP verification.
* Role-based access is enforced.
* Authentication is secure, scalable, and production-ready.
* All authentication flows include proper validation, error handling, and logging.
