-- NexGameWorld read-only production / restored-backup integrity overview.
-- Run with a least-privilege SELECT-only role. No player details are exposed.
-- Fresh character rows may have zero inventory slots until first initialization.
SELECT
 (SELECT COUNT(*)::int FROM ngw_accounts) AS accounts,
 (SELECT COUNT(*)::int FROM ngw_characters WHERE deleted_at IS NULL) AS active_characters,
 (SELECT COUNT(*)::int FROM ngw_character_progress) AS saved_characters,
 (SELECT COUNT(*)::int FROM ngw_characters c LEFT JOIN ngw_accounts a
  ON c.account_id=a.id WHERE a.id IS NULL) AS orphan_characters,
 (SELECT COUNT(*)::int FROM ngw_character_progress p LEFT JOIN ngw_characters c
  ON p.character_id=c.id WHERE c.id IS NULL) AS orphan_progress,
 (SELECT COUNT(*)::int FROM ngw_economy_receipts r LEFT JOIN ngw_characters c
  ON r.character_id=c.id WHERE c.id IS NULL) AS orphan_receipts,
 (SELECT COUNT(*)::int FROM ngw_progress_events e LEFT JOIN ngw_characters c
  ON e.character_id=c.id WHERE c.id IS NULL) AS orphan_events,
 (SELECT COUNT(*)::int FROM ngw_character_progress
  WHERE level NOT BETWEEN 1 AND 60 OR gold<0 OR experience<0 OR revision<0
  OR world_radius NOT BETWEEN 1 AND 2000) AS invalid_progress_numbers,
 (SELECT COUNT(*)::int FROM ngw_character_progress
  WHERE jsonb_typeof(inventory)<>'array'
    OR CASE WHEN jsonb_typeof(inventory)='array'
         THEN (jsonb_array_length(inventory)<>0 AND jsonb_array_length(inventory) NOT BETWEEN 12 AND 108)
         ELSE true END
    OR jsonb_typeof(action_bar)<>'array'
    OR jsonb_typeof(quests)<>'object'
    OR jsonb_typeof(equipment)<>'object') AS invalid_progress_json,
 (SELECT COUNT(*)::int FROM ngw_shared_chests
  WHERE jsonb_typeof(slots)<>'array'
    OR CASE WHEN jsonb_typeof(slots)='array'
         THEN jsonb_array_length(slots)<>18 ELSE true END) AS invalid_chest,
 (SELECT COUNT(*)::int FROM ngw_character_progress
  WHERE jsonb_typeof(inventory)='array' AND jsonb_array_length(inventory)=0)
  AS not_yet_initialized_bags,
 (SELECT COUNT(*)::int FROM ngw_shared_chests) AS shared_chests;
