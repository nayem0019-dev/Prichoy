-- Phase 4: Business Intelligence, Financial Management & Reporting
-- Run: npx prisma migrate dev --name phase4_bi_financial
-- Or on production: npx prisma migrate deploy
--
-- Changes:
-- 1. Return model — added courier-loss fields (outboundCharge, returnCharge,
--    packagingCost, recoverable) and product-recovery fields (recoveryAction,
--    resaleValue, totalLoss). Existing rows get NULL for all new columns.
-- 2. Exchange + ExchangeHistory — new tables for §15 Exchange Order Management.
-- 3. ExpenseCategory enum — extended with 11 new categories (Phase 4 §5).
--    Existing rows keep their current enum value — no data loss.
-- 4. Expense model — added customCategory, description, receiptUrl, createdById.
-- 5. PaidBy, RecoveryAction, ExchangeStatus — new enums.

-- NOTE: This file is the hand-written migration that documents the changes.
-- Run `npx prisma migrate dev` on a live database where `prisma generate` works
-- (the sandbox can't reach binaries.prisma.sh), which will apply these changes
-- automatically from the schema diff.

-- ── Return table additions ───────────────────────────────────────────────────
ALTER TABLE `returns`
  ADD COLUMN `outboundCharge` DECIMAL(10,2)    NULL,
  ADD COLUMN `outboundPaidBy` ENUM('CUSTOMER','BUSINESS') NULL,
  ADD COLUMN `returnCharge`   DECIMAL(10,2)    NULL,
  ADD COLUMN `returnPaidBy`   ENUM('CUSTOMER','BUSINESS') NULL,
  ADD COLUMN `packagingCost`  DECIMAL(10,2)    NULL,
  ADD COLUMN `recoverable`    BOOLEAN          NULL,
  ADD COLUMN `recoveryAction` ENUM('SELL_AGAIN','SELL_DISCOUNTED','DAMAGED','DESTROYED') NULL,
  ADD COLUMN `resaleValue`    DECIMAL(10,2)    NULL,
  ADD COLUMN `totalLoss`      DECIMAL(10,2)    NULL;

-- ── Exchange tables ──────────────────────────────────────────────────────────
CREATE TABLE `exchanges` (
  `id`                    VARCHAR(191) NOT NULL,
  `orderId`               VARCHAR(191) NOT NULL,
  `originalItemId`        VARCHAR(191) NULL,
  `requestedSize`         VARCHAR(191) NULL,
  `requestedColor`        VARCHAR(191) NULL,
  `requestedVariantId`    VARCHAR(191) NULL,
  `status`                ENUM('REQUESTED','APPROVED','REJECTED','REPLACEMENT_SHIPPED','COMPLETED') NOT NULL DEFAULT 'REQUESTED',
  `reservedAt`            DATETIME(3) NULL,
  `returnReceivedAt`      DATETIME(3) NULL,
  `replacementShippedAt`  DATETIME(3) NULL,
  `completedAt`           DATETIME(3) NULL,
  `rejectedReason`        TEXT NULL,
  `courierCharge`         DECIMAL(10,2) NULL,
  `courierPaidBy`         ENUM('CUSTOMER','BUSINESS') NULL,
  `adminNotes`            TEXT NULL,
  `createdById`           VARCHAR(191) NULL,
  `createdAt`             DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`             DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `exchanges_orderId_key` (`orderId`),
  INDEX `exchanges_status_idx` (`status`),
  CONSTRAINT `exchanges_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`),
  CONSTRAINT `exchanges_requestedVariantId_fkey` FOREIGN KEY (`requestedVariantId`) REFERENCES `variants`(`id`)
);

CREATE TABLE `exchange_history` (
  `id`         VARCHAR(191) NOT NULL,
  `exchangeId` VARCHAR(191) NOT NULL,
  `status`     ENUM('REQUESTED','APPROVED','REJECTED','REPLACEMENT_SHIPPED','COMPLETED') NOT NULL,
  `note`       TEXT NULL,
  `adminId`    VARCHAR(191) NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `exchange_history_exchangeId_idx` (`exchangeId`),
  CONSTRAINT `exchange_history_exchangeId_fkey` FOREIGN KEY (`exchangeId`) REFERENCES `exchanges`(`id`) ON DELETE CASCADE
);

-- ── Expense table additions ──────────────────────────────────────────────────
-- ExpenseCategory enum expansion — MySQL requires MODIFY COLUMN to change enum.
ALTER TABLE `expenses`
  MODIFY COLUMN `category` ENUM(
    'COURIER','MARKETING','SALARY','OFFICE','PACKAGING','MISCELLANEOUS',
    'FACEBOOK_ADS','GOOGLE_ADS','PHOTOGRAPHY','MODEL_HIRING','OFFICE_RENT',
    'UTILITIES','INTERNET','EQUIPMENT','SOFTWARE','TRAVEL','OTHER'
  ) NOT NULL,
  ADD COLUMN `customCategory` VARCHAR(191) NULL,
  ADD COLUMN `description`    TEXT         NULL,
  ADD COLUMN `receiptUrl`     VARCHAR(191) NULL,
  ADD COLUMN `createdById`    VARCHAR(191) NULL;
