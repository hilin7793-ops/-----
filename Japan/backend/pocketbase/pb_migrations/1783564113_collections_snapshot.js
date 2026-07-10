/// <reference path="../pb_data/types.d.ts" />

// This historical snapshot previously re-imported an older full collection dump.
// The current schema source of truth is:
// 1. 1783563200_import_japan_core_schema.js
// 2. later incremental migrations
//
// Keeping the old snapshot active would overwrite newer collection changes when
// a fresh PocketBase instance replays migrations from the beginning.
migrate((app) => {
  return null;
}, (app) => {
  return null;
})
