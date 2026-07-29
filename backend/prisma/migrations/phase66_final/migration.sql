-- Phase 6.6: Final Development Phase
-- Run: npx prisma migrate dev --name phase66_final

-- ── Performance indexes on orders (Module 13) ───────────────────
-- These indexes improve location analytics, sandbox queries,
-- and source-tracking filters without touching any existing data.
CREATE INDEX `orders_shippingDistrict_idx` ON `orders` (`shippingDistrict`);
CREATE INDEX `orders_isTest_status_idx`    ON `orders` (`isTest`, `status`);
CREATE INDEX `orders_orderSource_idx`      ON `orders` (`orderSource`);
CREATE INDEX `orders_isTest_createdAt_idx` ON `orders` (`isTest`, `createdAt`);

-- ── Module 2: Business Decision Log ─────────────────────────────
CREATE TABLE `decision_logs` (
  `id`             VARCHAR(191) NOT NULL,
  `title`          VARCHAR(191) NOT NULL,
  `description`    TEXT         NOT NULL,
  `reason`         TEXT         NOT NULL,
  `expectedResult` TEXT         NOT NULL,
  `actualResult`   TEXT         NULL,
  `relatedModule`  VARCHAR(191) NULL,
  `priority`       ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `status`         ENUM('PLANNED','ACTIVE','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PLANNED',
  `decidedById`    VARCHAR(191) NULL,
  `decidedAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewAt`       DATETIME(3)  NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `decision_logs_status_idx`    (`status`),
  INDEX `decision_logs_priority_idx`  (`priority`),
  INDEX `decision_logs_decidedAt_idx` (`decidedAt`),
  CONSTRAINT `decision_logs_decidedById_fkey`
    FOREIGN KEY (`decidedById`) REFERENCES `users`(`id`)
);

-- ── Module 4: Web Page View (analytics beacon) ──────────────────
CREATE TABLE `web_page_views` (
  `id`        VARCHAR(191) NOT NULL,
  `event`     VARCHAR(50)  NOT NULL,
  `page`      VARCHAR(500) NULL,
  `productId` VARCHAR(191) NULL,
  `referrer`  VARCHAR(500) NULL,
  `sessionId` VARCHAR(191) NULL,
  `district`  VARCHAR(191) NULL,
  `device`    VARCHAR(20)  NULL,
  `createdAt` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `web_page_views_event_createdAt_idx` (`event`, `createdAt`),
  INDEX `web_page_views_productId_idx`       (`productId`),
  INDEX `web_page_views_createdAt_idx`       (`createdAt`),
  INDEX `web_page_views_sessionId_idx`       (`sessionId`)
);
