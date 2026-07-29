-- Phase 6.5: Production Readiness & Admin Experience
-- Run: npx prisma migrate dev --name phase6_5_production_readiness
--
-- Changes:
--   1. orders.isTest      BOOLEAN NOT NULL DEFAULT false  (sandbox mode flag)
--   2. Role enum extended with OWNER value (highest privilege tier)
--   3. Settings table already exists — sandbox keys written at runtime
--      via the existing key/value upsert, no schema change needed.

-- ── Order sandbox flag ──────────────────────────────────────────
-- All existing rows default to false (real orders), which is correct.
ALTER TABLE `orders`
  ADD COLUMN `isTest` BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient "exclude test orders" query in analytics
CREATE INDEX `orders_isTest_idx` ON `orders` (`isTest`);

-- ── Role enum: add OWNER ────────────────────────────────────────
-- MySQL requires MODIFY COLUMN to extend an ENUM.
-- Existing rows keep their current enum value — no data migration needed.
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM(
    'OWNER',
    'SUPER_ADMIN',
    'ADMIN',
    'ORDER_MANAGER',
    'INVENTORY_MANAGER',
    'CUSTOMER_SUPPORT',
    'DELIVERY_MANAGER',
    'ACCOUNTANT'
  ) NOT NULL DEFAULT 'ORDER_MANAGER';

-- ── No other schema changes ──────────────────────────────────────
-- Sandbox config (sandboxMode, sendEmail, sendWhatsapp) is stored as
-- rows in the existing `settings` table (key=sandbox_mode etc.) and
-- written at runtime via upsert — no DDL needed.
-- OWNER account protection is enforced in the auth middleware and
-- does not require a database constraint at this stage (Phase 7 will
-- add a `isOwner` column or similar when the full role system ships).
