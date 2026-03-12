# Permissoes V1 Baseline

## Scope

This document records the current permission model observed on March 10, 2026.

## Source of truth

- `firestore.rules` versioned in this repository.
- Frontend access patterns from the current React app.

## Helper functions currently in rules

- `isSignedIn()`
- `userDoc(uid)`
- `isAdmin()`
- `isSelf(userId)`
- `isValidUserCreate()`
- `isAllowedSelfUserUpdate()`
- `isProviderOwner()`
- `isProviderOwnerCreate()`
- `isAllowedProviderDeliveryUpdate()`
- `hasAttachments()`
- `isAllowedMeasurementUpdate()`

## Permission Matrix

| Path | Read | Create | Update | Delete | Notes |
| --- | --- | --- | --- | --- | --- |
| `users/{userId}` | Admin or self | Self with strict pending payload | Admin or self with limited fields | Never | Self can change only `name`, `email`, `photoURL`, `pixKey`. |
| `projects/{projectId}` | Admin, manager or member | Admin | Admin or manager | Admin | Core operational collection. |
| `projects/{projectId}/attachments/{attachmentId}` | Admin, manager or member of parent project | Admin | Admin | Admin | Path is in rules but not used by the current UI. |
| `companies/{companyId}` | Any signed-in user | Admin | Admin | Admin | Current rules allow provider read access even though the UI hides companies from providers. |
| `deliveries/{deliveryId}` | Admin, provider owner, manager or member | Admin | Admin or provider owner | Admin | Provider owner can currently update any field on the delivery document. |
| `providerDeliveries/{deliveryId}` | Admin or provider owner | Admin or provider owner with `status == ENVIADA` and attachments | Admin or provider owner with attachments-only patch | Admin | Legacy collection outside the visible UI. |
| `paymentMilestones/{milestoneId}` | Admin or provider owner | Admin | Admin | Admin | Legacy finance surface. |
| `measurementReports/{reportId}` | Admin or provider owner | Admin or provider owner with `status == ENVIADO` | Admin or provider owner with limited patch | Admin | Legacy measurement/reporting surface. |
| `meetings/{meetingId}` | Admin or participant | Admin | Admin | Admin | Provider can only read meetings they participate in. |
| `providers/{providerUid}/safetyDocs/{docId}` | Admin | Admin | Admin | Admin | Current provider docs are fully admin-only. |
| `providers/{providerUid}/attachments/{attachmentId}` | Admin | Admin | Admin | Admin | Legacy admin-only path. |
| `notifications/{notificationId}` | Recipient user | Signed-in admin or signed-in user notifying an admin | Recipient user | Recipient user | Providers can create notifications to admins, but not to arbitrary providers. |

## Current Practical Implications

### ADMIN

Current admin capabilities under the baseline:

- Full read/write control over users, projects, companies, deliveries, meetings, provider documents and notifications they receive.
- Can approve, reject and soft-delete user profiles through the `users` collection.
- Can create projects, deliveries, meetings, companies and notifications.

### PRESTADOR

Current provider capabilities under the baseline:

- Can create their own pending `users/{uid}` profile on first access.
- Can update only their own basic profile fields.
- Can read projects where they are a member.
- Can read deliveries where they are provider owner, manager or listed member.
- Can update deliveries where `providerUid == request.auth.uid` with no field-level restriction in the current `deliveries` rule.
- Can read meetings where they are a participant.
- Can read, update and delete only notifications addressed to themselves.
- Cannot read other user profiles directly under current rules.
- Cannot access provider safety docs under the current rules.

## Known Baseline Mismatches Between Rules And Frontend

These are not V2 changes. They are current-state observations that must be preserved or addressed explicitly in later phases.

1. `companies` are admin-only in the UI, but readable by any signed-in user under the current rules.
2. `deliveries` updates are highly permissive for the assigned provider. The current UI relies on this to update `status`, `progress`, `comments`, `externalLinks` and `deadlineChangeRequest`.
3. `deliveries` read access references `managerUid` and `memberUids`, but the current create flow does not guarantee those fields are written.
4. Legacy collections (`providerDeliveries`, `paymentMilestones`, `measurementReports`) remain part of the security surface even though they are not represented in the current repository UI.
5. Provider safety documents are admin-only in rules, which matches the current UI behavior but will matter in the V2 migration toward user-scoped documents.

## V1 Guardrail For Later Phases

Any later phase that changes routing, area separation or data modeling must continue to respect the current rules baseline until the corresponding Firestore rules change is explicitly versioned and deployed.
