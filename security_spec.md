# Security Specification - DecentralVoter

## Data Invariants
1. A vote cannot be cast if the election is not active.
2. A user can only vote once per election.
3. Votes must form a valid chain (previousHash must match the hash of the preceding vote).
4. Users cannot modify their own isAdmin flag.
5. Election results are computed by counting valid votes in the subcollection.

## The "Dirty Dozen" Payloads (Denial Expected)
1. **Identity Spoofing**: Create a vote with `userId` of another user.
2. **Double Voting**: Create two vote documents in the same election for the same `userId`.
3. **Chain Corruption**: Create a vote with a random `previousHash` that doesn't exist.
4. **Election Hijack**: Create/Update an election document if not an admin.
5. **PII Leak**: Read a private user profile of another user.
6. **Status Bypass**: Create an election with `status: 'active'` directly as a non-admin.
7. **Timestamp Fraud**: Set `timestamp` to a future/past date instead of `request.time`.
8. **Hash Collision Manipulation**: Update a vote's `optionId` after it's been cast.
9. **Option Hijack**: Vote for an `optionId` that doesn't exist in the election.
10. **Admin Escalation**: Update own user profile to set `isAdmin: true`.
11. **Election Modification**: Update an election's `title` after it has started.
12. **Vote Deletion**: Attempt to delete a vote to "reset" the count.

## Test Runner (Draft Concepts)
The tests will verify:
- `allow create` on `/elections/{id}/votes/{vid}` requires `auth.uid == incoming().userId`.
- `allow create` on `/elections/{id}/votes/{vid}` requires election to be active.
- `allow update` on `/elections/{id}` restricted to admins.
- `allow delete` on votes is globally `false`.
