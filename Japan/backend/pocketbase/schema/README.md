# PocketBase Schema Draft

This folder contains the first schema draft for the Japan game backend.

## Files

- `coreCollectionsDraft.js`
  - Source-of-truth draft for the collections we need next.
  - This is not an executable PocketBase migration yet.
  - It is a structured collection spec that we can convert into migrations.
- `buildPocketBaseSchema.mjs`
  - Converts the draft into a generated import JSON and a JS migration file.
- `generated/pb_collections.generated.json`
  - Generated PocketBase collection payload.
- `../pb_migrations/1783563200_import_japan_core_schema.js`
  - Generated migration that imports the current draft collections.
- `../pb_migrations/1783566200_add_players_auth_user_id.js`
  - Incremental migration for existing PocketBase instances that already applied the earlier core schema.
- `../pb_migrations/1783566200_add_ticket_rating_and_shop_priority.js`
  - Incremental migration for existing PocketBase instances that need ticket rating, general shop priority, and auction rating fields.
- `../pb_migrations/1783566300_add_users_auth_collection.js`
  - Adds the PocketBase `users` auth collection for token-based player auth flows.
- `../pb_migrations/1783564113_collections_snapshot.js`
  - Kept as a no-op placeholder to avoid replaying an outdated full snapshot over newer schema migrations.

## Why this comes now

The backend already has working in-memory services for:

- ticket generation
- general shop
- auction shop
- blind box basics

The next bottleneck is the real database shape. If we keep building services
without locking collections and relations first, we will keep rewriting the
data layer.

## Recommended implementation order

1. Finalize the core collections in `coreCollectionsDraft.js`.
2. Run `node .\\schema\\buildPocketBaseSchema.mjs`.
3. Review the generated migration and collection JSON.
4. Apply the migration with PocketBase.
5. If your PocketBase instance was already migrated before `authUserId` was added, also run that incremental migration.
6. If your PocketBase instance was already migrated before ticket rating and shop priority were added, also run `1783566200_add_ticket_rating_and_shop_priority.js`.
7. Build a PocketBase adapter for `createDataAccessLayer`.
8. Move `game`, `player`, `journey`, and `record` services onto the real adapter.

## First-pass collection set

- `maps`
- `locations`
- `players`
- `games`
- `game_players`
- `tickets`
- `player_tickets`
- `journeys`
- `shops`
- `shop_items`
- `auctions`
- `auction_bids`
- `blind_boxes`
- `blind_box_effect_logs`
- `player_special_states`
- `traffic_incident_requests`
- `records`

## Notes

- Some fields deliberately use `json` for speed of iteration, especially:
  - `customRules`
  - `gameSettings`
  - `effectData`
  - `payload`
  - `metadata`
- Once the gameplay loop stabilizes, we can normalize some of those shapes.
- `players` is kept as a cross-game profile table, while `game_players` stores
  runtime state for a player inside one game.
- `tickets` stores the ticket master record, and `player_tickets` keeps the
  ownership relation and acquisition source history.

## Next concrete step

The next coding step should be:

1. run the schema generator:
   - `node .\\schema\\buildPocketBaseSchema.mjs`
2. apply the generated migration when ready:
   - `.\\pocketbase.exe migrate up`
3. create a PocketBase adapter under `Japan/backend/system/src/services/data`
4. map the first 4-5 collections:
   - `games`
   - `game_players`
   - `tickets`
   - `shop_items`
   - `auctions`
5. switch the current smoke test from in-memory to PocketBase for those flows

## Auth smoke test prerequisites

`Japan/backend/system/scripts/pocketbase-auth-smoke-test.js` needs one of:

- `POCKETBASE_ADMIN_EMAIL` + `POCKETBASE_ADMIN_PASSWORD`
- `POCKETBASE_AUTH_TOKEN`

Optional:

- `POCKETBASE_URL`
- `POCKETBASE_AUTH_COLLECTION` (defaults to `users`)

## Flow smoke test prerequisites

`Japan/backend/system/scripts/pocketbase-flow-smoke-test.js` also needs one of:

- `POCKETBASE_ADMIN_EMAIL` + `POCKETBASE_ADMIN_PASSWORD`
- `POCKETBASE_AUTH_TOKEN`

Optional:

- `POCKETBASE_URL`
