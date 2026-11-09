# Kassa Staff & Branches — integration guide

## Implemented

- Live business-scoped Staff / Branches / Roles tabs, no demo records.
- Owner can create and edit branches (name, code, location, phone, active status).
- Owner can create and edit custom roles and their specific operation permissions.
- Owner can invite staff, choose a custom role and active branch, reassign active staff, and cancel unused invites.
- A one-time 7-day invitation URL is generated and shown to the owner. Only its SHA-256 hash is stored in the database.
- Invited staff can sign in using the invited email or create an account directly from the invitation page, then join the assigned business/branch.
- Invitation acceptance is transactional, single-use, and rejects wrong emails, expired/revoked links, Owner roles, or inactive branches.
- API enforces Manage sales & transactions, Manage products & inventory, and Manage customers permissions. Non-owners are restricted to one active assigned branch for sales/inventory.
- Staff/branch/role management remains restricted to Owner regardless of custom-role selections. System Owner role cannot be edited or assigned by invitations.

## Limitation: emails

No invitation email is sent. The owner must copy the secure invitation link and share it through a trusted channel. Link generated on localhost can only be opened from the computer hosting Kassa; use a reachable deployed HTTPS domain for invitations to other devices.

## Database migration required

The new migration is: backend/prisma/migrations/20261109112500_staff_branches/migration.sql.
It adds optional code, city and state columns to Branch and creates StaffInvitation. Existing business data is retained.

Run from the repo root (after saving any local changes):

    cd C:\dev\KASSA
    git status
    git pull origin main
    cd backend
    npx prisma migrate deploy
    npx prisma migrate status
    npm run db:generate
    npm run typecheck
    npm run start:dev

In a separate frontend terminal:

    cd C:\dev\KASSA
    npx next typegen
    npx tsc --noEmit
    npm run dev

If Next.js still references deleted pages in .next/types/validator.ts, stop dev, remove .next, regenerate types and retry.

## Manual testing

1. Log in as owner; open Staff & Branches. Verify actual Owner and onboarding branches, with no example staff.
2. Create a branch and confirm it appears in Branches and the dashboard branch selector.
3. Create a role with Manage sales & transactions. Invitation requires a non-owner role.
4. Invite a real email to an active branch; ensure it appears as Pending. Copy the link immediately; no automatic email is sent.
5. Use a separate browser profile on the same development host to open the invite, create a staff login, and join. Existing Kassa users can log in with the invited email and accept.
6. Test a staff sale in their branch and verify another branch and staff management APIs are denied.
7. Owner reassigns staff and edits role permissions; new API calls must immediately reflect these changes.
8. Owner edits a branch; deactivation with assigned staff should be rejected.
9. Cancel a pending invite. Used, revoked, expired and wrong-email invitations must not work.
10. Verify that remember-me, owners, products, customers and sales still work.

## Still to implement

- Email delivery, removal/suspension of staff, complete auditing, granular report/dashboard gating, customer segmentation and electronic payment verification.
- View dashboard and View reports & analytics permissions are stored on roles, but these feature areas are not yet comprehensively enforced on every route.
- StaffOnboardingDraft records from onboarding are only drafts, not active accounts or invitations.
- Backend and frontend typechecks and runtime flows have not yet been run in the user's Windows/Supabase environment.
