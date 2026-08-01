-- One-time migration: backfill public_id UUIDs for existing rows
-- Run after Hibernate ddl-auto=update has added the public_id columns.
-- Assumes PostgreSQL 13+ (gen_random_uuid()).

UPDATE staff         SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE medicine      SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE medicine_type SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE sale          SET public_id = gen_random_uuid() WHERE public_id IS NULL;
UPDATE sale_item     SET public_id = gen_random_uuid() WHERE public_id IS NULL;
