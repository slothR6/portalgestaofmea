# Schema V1 Baseline

## Scope

This document records the Firestore baseline observed on March 10, 2026 before the V2 refactor starts.

## Assumptions

- `firestore.rules` in this repository reflects the production rules snapshot provided in the implementation brief on March 10, 2026.
- `firestore.indexes.json` is an inferred baseline from the current frontend queries because the live Firebase export is not versioned in this repository.
- This file does not invent V2 structures. It only describes collections, fields and query shapes already visible in the codebase or in the current rules snapshot.

## Collection Inventory

| Path | Source | Used by current frontend | Notes |
| --- | --- | --- | --- |
| `users/{uid}` | Code + rules | Yes | Main profile collection for auth, role and activation. |
| `projects/{projectId}` | Code + rules | Yes | Stores both active projects and legacy proposals via `status == "PROPOSTA"`. |
| `projects/{projectId}/attachments/{attachmentId}` | Rules | No visible usage in current repo | Legacy secured subcollection still present in rules baseline. |
| `companies/{companyId}` | Code + rules | Yes | Top-level client/company registry. |
| `deliveries/{deliveryId}` | Code + rules | Yes | Operational delivery document. Current app stores comments, links and deadline requests inside the document. |
| `providerDeliveries/{deliveryId}` | Rules | No visible usage in current repo | Legacy collection still protected by production rules. |
| `paymentMilestones/{milestoneId}` | Rules | No visible usage in current repo | Legacy finance-related collection. |
| `measurementReports/{reportId}` | Rules | No visible usage in current repo | Legacy measurement/reporting collection. |
| `meetings/{meetingId}` | Code + rules | Yes | Scheduling and meeting participation. |
| `providers/{providerUid}/safetyDocs/{docId}` | Code + rules | Yes | Current storage for provider safety documents. |
| `providers/{providerUid}/attachments/{attachmentId}` | Rules | No visible usage in current repo | Legacy admin-only attachment path for providers. |
| `notifications/{notificationId}` | Code + rules | Yes | Top-level notification collection scoped by `toUid`. |

## Known Document Shapes

### `users/{uid}`

Known fields from [src/types/index.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/types/index.ts) and auth flow:

- `uid: string`
- `email: string`
- `name: string`
- `role: "ADMIN" | "PRESTADOR"`
- `status: "PENDING" | "ACTIVE" | "REJECTED" | "DELETED"`
- `active: boolean`
- `pixKey?: string`
- `photoURL?: string`
- `createdAt: number`
- `approvedAt?: number`
- `deletedAt?: number`

Lifecycle observed in code:

- Signup and first Google access create a `PRESTADOR` with `PENDING` and `active = false`.
- Admin actions can approve, reject or soft-delete the user.

### `projects/{projectId}`

Known fields from the current TypeScript model:

- `companyId: string`
- `companyName: string`
- `name: string`
- `description?: string`
- `manager: string`
- `managerUid: string`
- `memberUids: string[]`
- `status: "PROPOSTA" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO" | "RECUSADA"`
- `proposalCode?: string`
- `proposalSequence?: number`
- `projectType?: "INSPECAO" | "ANALISE_FALHA" | "DESENVOLVIMENTO_ENGENHARIA" | "OUTRO"`
- `projectTypeOther?: string`
- `completionRate: number`
- `externalLinks?: ExternalLink[]`
- `createdAt: number`
- `updatedAt?: number`
- `deletedAt?: number`

Current operational note:

- Proposal and project share the same collection. Proposal semantics are represented by `status == "PROPOSTA"`.

### `companies/{companyId}`

Known fields:

- `companyNumber?: number`
- `name: string`
- `cnpj?: string`
- `email?: string`
- `phone?: string`
- `notes?: string`
- `createdAt: number`
- `createdByUid: string`
- `deletedAt?: number`

### `deliveries/{deliveryId}`

Known fields from the current TypeScript model and rules baseline:

- `projectId: string`
- `client: string`
- `project: string`
- `title: string`
- `deadline: string`
- `status: "PENDENTE" | "REVISAO" | "AJUSTES" | "APROVADO" | "ATRASADO"`
- `progress: "A_FAZER" | "FAZENDO" | "REVISAO" | "APROVADO"`
- `priority: "BAIXA" | "MEDIA" | "ALTA"`
- `provider: string`
- `providerUid?: string`
- `description: string`
- `checklist: ChecklistItem[]`
- `attachments: Attachment[]`
- `comments: Comment[]`
- `externalLinks?: ExternalLink[]`
- `deadlineChangeRequest?: { ... }`
- `createdAt: number`
- `updatedAt?: number`
- `deletedAt?: number`
- `managerUid?: string` (referenced by current rules, not guaranteed by the current create flow)
- `memberUids?: string[]` (referenced by current rules, not guaranteed by the current create flow)

Compatibility note:

- The frontend currently creates deliveries without `managerUid` and `memberUids`, but the production rules baseline references both fields for read access.

### `meetings/{meetingId}`

Known fields:

- `title: string`
- `description?: string`
- `startsAt: number`
- `endsAt: number`
- `status: "SCHEDULED" | "DONE" | "CANCELED"`
- `completedAt?: number`
- `participantUids: string[]`
- `link?: string`
- `createdByUid: string`
- `createdAt: number`
- `updatedAt?: number`

### `providers/{providerUid}/safetyDocs/{docId}`

Known fields:

- `title: string`
- `issuedAt: string`
- `expiresAt?: string`
- `notes?: string`
- `externalUrl?: string`
- `createdAt: number`
- `createdByUid: string`
- `createdByName: string`

### `notifications/{notificationId}`

Known fields:

- `toUid: string`
- `type: "COMMENT" | "SUBMITTED" | "APPROVED" | "ADJUST_REQUESTED" | "MEETING" | "NEW_DELIVERY" | "STARTED" | "DEADLINE_CHANGE_REQUESTED" | "DEADLINE_CHANGE_APPROVED" | "DEADLINE_CHANGE_REJECTED"`
- `title: string`
- `projectId?: string`
- `deliveryId?: string`
- `createdAt: number`
- `read: boolean`

### Legacy collections present in rules but not used by the current frontend

These collections are part of the production rules surface and must not be ignored during V2 planning, even though the current repository does not contain UI or services for them:

- `providerDeliveries/{deliveryId}`
- `paymentMilestones/{milestoneId}`
- `measurementReports/{reportId}`
- `projects/{projectId}/attachments/{attachmentId}`
- `providers/{providerUid}/attachments/{attachmentId}`

For these collections, the baseline is intentionally conservative: only the fields referenced in the rules are confirmed.

## Query Inventory From The Current Frontend

| Query | Source file | Notes |
| --- | --- | --- |
| `users orderBy(createdAt desc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Admin user list. |
| `users where status == ACTIVE and active == true orderBy(createdAt desc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Defined for non-admin usage, not currently subscribed in the UI. |
| `users where role == ADMIN and status == ACTIVE and active == true` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Used to fan out admin notifications. |
| `projects orderBy(createdAt desc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Admin list. |
| `projects where memberUids array-contains uid orderBy(createdAt desc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Provider project list. |
| `projects where companyId == ...` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Used to compute next proposal sequence. |
| `deliveries orderBy(createdAt desc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Admin list. |
| `deliveries where providerUid == uid orderBy(createdAt desc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Provider delivery list. |
| `deliveries where projectId == projectId` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Used during hard delete cascade for projects. |
| `companies orderBy(createdAt desc)` | [src/services/companies.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/companies.ts) | Admin company list. |
| `meetings orderBy(startsAt asc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Admin meetings. |
| `meetings where participantUids array-contains uid` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Provider meetings. |
| `providers/{uid}/safetyDocs orderBy(createdAt desc)` | [src/services/portal.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/portal.ts) | Admin-only provider document view. |
| `notifications where toUid == uid orderBy(createdAt desc)` | [src/services/notifications.ts](/c:/Users/pedru/OneDrive/Área%20de%20Trabalho/portalgestaofmea/src/services/notifications.ts) | User notification feed. |

## Baseline Index Strategy

The repository baseline adds inferred composite indexes for the query shapes most likely to require them:

- `users(status, active, createdAt desc)`
- `users(role, status, active)`
- `projects(memberUids array-contains, createdAt desc)`
- `deliveries(providerUid, createdAt desc)`
- `notifications(toUid, createdAt desc)`

This inferred baseline should be compared against the live Firebase export before any production deployment step.
