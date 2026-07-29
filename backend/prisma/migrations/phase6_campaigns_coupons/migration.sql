-- Phase 6: Campaign Engine, Extended Coupons, Order Source Tracking
-- Run: npx prisma migrate dev --name phase6_campaigns_coupons

-- ── Campaigns ──────────────────────────────────────────────────
CREATE TABLE `campaigns` (
  `id`              VARCHAR(191) NOT NULL,
  `name`            VARCHAR(191) NOT NULL,
  `slug`            VARCHAR(191) NOT NULL,
  `type`            ENUM('GRAND_OPENING','FLASH_SALE','EID_SALE','WINTER_SALE','SUMMER_SALE','BLACK_FRIDAY','CLEARANCE','NEW_ARRIVAL','CUSTOM') NOT NULL,
  `description`     TEXT         NULL,
  `bannerUrl`       VARCHAR(191) NULL,
  `status`          ENUM('DRAFT','ACTIVE','PAUSED','ENDED') NOT NULL DEFAULT 'DRAFT',
  `priority`        INT          NOT NULL DEFAULT 10,
  `startDate`       DATETIME(3)  NULL,
  `endDate`         DATETIME(3)  NULL,
  `autoActivate`    BOOLEAN      NOT NULL DEFAULT false,
  `autoDeactivate`  BOOLEAN      NOT NULL DEFAULT false,
  `discountType`    VARCHAR(191) NULL,
  `discountValue`   DECIMAL(10,2) NULL,
  `isStackable`     BOOLEAN      NOT NULL DEFAULT false,
  `createdById`     VARCHAR(191) NULL,
  `createdAt`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `campaigns_slug_key` (`slug`),
  INDEX `campaigns_status_idx` (`status`),
  INDEX `campaigns_startDate_endDate_idx` (`startDate`, `endDate`)
);

-- ── Extend Coupon table ──────────────────────────────────────────
-- Add Phase 6 fields (all nullable/additive — no data migration needed)
ALTER TABLE `coupons`
  ADD COLUMN `customerLimit`      INT          NULL DEFAULT 1,
  ADD COLUMN `description`        VARCHAR(500) NULL,
  ADD COLUMN `eligibleProductIds` TEXT         NULL,
  ADD COLUMN `eligibleCategoryIds` TEXT        NULL,
  ADD COLUMN `customerId`         VARCHAR(191) NULL,
  ADD COLUMN `campaignId`         VARCHAR(191) NULL,
  ADD COLUMN `isStackable`        BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN `singleUse`          BOOLEAN      NOT NULL DEFAULT false,
  ADD INDEX  `coupons_customerId_idx` (`customerId`),
  ADD INDEX  `coupons_campaignId_idx` (`campaignId`),
  ADD CONSTRAINT `coupons_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`),
  ADD CONSTRAINT `coupons_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`);

-- ── Coupon Redemption tracking ──────────────────────────────────
CREATE TABLE `coupon_redemptions` (
  `id`         VARCHAR(191) NOT NULL,
  `couponId`   VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NULL,
  `orderId`    VARCHAR(191) NULL,
  `usedAt`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `coupon_redemptions_couponId_idx` (`couponId`),
  INDEX `coupon_redemptions_customerId_idx` (`customerId`),
  CONSTRAINT `coupon_redemptions_couponId_fkey` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE CASCADE,
  CONSTRAINT `coupon_redemptions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`)
);

-- ── Order source tracking (§17, §18) ────────────────────────────
ALTER TABLE `orders`
  ADD COLUMN `orderSource`        VARCHAR(50)  NULL,
  ADD COLUMN `manualCreatedBy`    VARCHAR(191) NULL,
  ADD COLUMN `manualCreatorRole`  VARCHAR(50)  NULL;
