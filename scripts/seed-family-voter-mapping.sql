/**
 * Seed script: Map voters to families grouped by (part + surname)
 *
 * - Deletes existing families (if unmapped)
 * - Creates ~4,700 families grouped by part_id + voter surname
 * - Assigns all 18,695 voters to families (max 7 members per family)
 * - Sets one captain per family (first voter in group)
 * - Updates total_members, head_name, house_no, address on each family
 *
 * Target: EC_nitish tenant DB on localhost:5333
 *
 * Run:
 *   psql -h localhost -p 5333 -U postgres -d EC_nitish -f scripts/seed-family-voter-mapping.sql
 */

-- Step 1: Clear existing families and voter mappings
UPDATE voters SET family_id = NULL, is_family_captain = FALSE WHERE family_id IS NOT NULL;
DELETE FROM families;

-- Step 2: Create families by (part + surname) and assign voters
DO $$
DECLARE
  rec RECORD;
  family_id_new TEXT;
  voter_rec RECORD;
  member_count INT;
  sub_family_num INT;
  voter_ids TEXT[];
  chunk_start INT;
  chunk_end INT;
  max_family_size INT := 7;
  election_id_val TEXT := '831795f6-3709-48d9-ac00-19df7e20efe0';
BEGIN
  -- Loop through each part+surname group
  FOR rec IN
    SELECT
      part_id,
      split_part(name, ' ', array_length(string_to_array(name, ' '), 1)) AS surname,
      COUNT(*) AS cnt
    FROM voters
    WHERE name IS NOT NULL AND name != '' AND part_id IS NOT NULL
    GROUP BY part_id, surname
    ORDER BY part_id, surname
  LOOP
    -- Collect voter IDs ordered by sl_number
    SELECT array_agg(id ORDER BY sl_number) INTO voter_ids
    FROM voters
    WHERE part_id = rec.part_id
      AND split_part(name, ' ', array_length(string_to_array(name, ' '), 1)) = rec.surname;

    -- Split into sub-families if group > max_family_size
    sub_family_num := 0;
    chunk_start := 1;

    WHILE chunk_start <= array_length(voter_ids, 1) LOOP
      sub_family_num := sub_family_num + 1;
      chunk_end := LEAST(chunk_start + max_family_size - 1, array_length(voter_ids, 1));

      -- Get the first voter in this chunk as the head/captain
      SELECT id, name, house_number, address
      INTO voter_rec
      FROM voters WHERE id = voter_ids[chunk_start];

      family_id_new := gen_random_uuid()::text;
      member_count := chunk_end - chunk_start + 1;

      -- Create the family record
      INSERT INTO families (id, election_id, part_id, family_name, head_name, house_no, address, total_members, created_at, updated_at)
      VALUES (
        family_id_new,
        election_id_val,
        rec.part_id,
        rec.surname || ' Family',
        voter_rec.name,
        voter_rec.house_number,
        voter_rec.address,
        member_count,
        NOW(),
        NOW()
      );

      -- Assign voters in this chunk to the family
      UPDATE voters
      SET family_id = family_id_new, is_family_captain = FALSE
      WHERE id = ANY(voter_ids[chunk_start:chunk_end]);

      -- Set first voter as captain
      UPDATE voters
      SET is_family_captain = TRUE
      WHERE id = voter_ids[chunk_start];

      chunk_start := chunk_end + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 3: Verify results
SELECT
  (SELECT COUNT(*) FROM families) AS total_families,
  (SELECT COUNT(*) FROM voters WHERE family_id IS NOT NULL) AS mapped_voters,
  (SELECT COUNT(*) FROM voters WHERE family_id IS NULL) AS unmapped_voters,
  (SELECT COUNT(*) FROM voters WHERE is_family_captain = TRUE) AS captains,
  (SELECT AVG(total_members)::numeric(4,1) FROM families) AS avg_members,
  (SELECT MIN(total_members) FROM families) AS min_members,
  (SELECT MAX(total_members) FROM families) AS max_members;
