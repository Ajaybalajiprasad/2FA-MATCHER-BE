# Friends

Friendship is mutual. A traveller sends a request, the recipient accepts or
declines, and the sender can cancel while it is pending. Either friend can later
remove the friendship. Removing a friend never removes group membership.

## API

All routes require the existing `X-User-Id` identity header.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/friends` | Own `friends`, `incoming`, `outgoing` lists, with traveller profiles |
| GET | `/api/friends/relationship/:travellerId` | `SELF`, `NONE`, `INCOMING`, `OUTGOING` or `FRIENDS`, with `requestId` |
| POST | `/api/friends/requests` | Send a request using `{ "travellerId": "T-002" }` |
| POST | `/api/friends/requests/:id/accept` | Accept as the recipient |
| DELETE | `/api/friends/requests/:id` | Decline as recipient or cancel as sender |
| DELETE | `/api/friends/:travellerId` | Remove an accepted friendship |

Successful responses use the existing API response envelope. Duplicate/reverse
requests and stale decisions return 409. A sender cannot accept their own
request (403). Other travellers cannot inspect or change a request by ID (404).
The API derives the acting identity from middleware, never a request-body ID.

## Persistence and access

`friendships` stores a canonical ordered traveller pair, requester, status and
timestamps. A database unique constraint prevents simultaneous opposite requests
from creating duplicate friendships. Status conditions on updates/deletes
protect against concurrent accept, cancel and remove operations.

Migration `0002_friends` is additive and runs through normal server startup.
It does not reset or reseed existing travellers, groups, messages or bookings.

The `/api/travellers/:id` endpoint supplies basic profiles publicly, but only the
profile owner and accepted friends receive group summaries. Other viewers
(including anonymous callers and pending requests) receive `canViewGroups: false`
and an empty `groups` array. The API never fetches those groups for unauthorized
viewers, ignores query parameters claiming another identity, and uses private,
no-store response headers. Removing a friendship revokes this permission on the
next request. Friendships do not grant membership: private group chat, hotel search
and booking actions continue to require group membership and existing roles.

Routes, validators, controllers, service rules and repository queries are kept in
separate files using the same structure as the existing backend. Swagger includes
all routes under the Friends tag.

## Verification

Run `pnpm typecheck` and `pnpm test`. The Friends API tests use isolated PGlite,
including duplicate and simultaneous requests, authorization, persistence,
cancel/decline/removal, and group-access isolation. They do not reset Neon.
