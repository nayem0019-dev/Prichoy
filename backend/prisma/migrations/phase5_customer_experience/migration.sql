-- Phase 5: Customer Experience
-- Run: npx prisma migrate dev --name phase5_customer_experience
--
-- New tables:
--   customer_wishlists     — server-persisted wishlist per customer
--   product_reviews        — verified-purchase reviews with moderation
--   review_helpful_votes   — anti-double-vote tracking for helpful clicks
--   customer_gallery       — verified-purchaser photo uploads with approval
--   customer_notification_prefs — per-customer notification channel preferences
--   customer_sessions      — real JWT-based customer auth sessions

CREATE TABLE `customer_wishlists` (
  `id`         VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `productId`  VARCHAR(191) NOT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_wishlists_customerId_productId_key` (`customerId`, `productId`),
  INDEX `customer_wishlists_customerId_idx` (`customerId`),
  CONSTRAINT `customer_wishlists_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_wishlists_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE
);

CREATE TABLE `product_reviews` (
  `id`             VARCHAR(191) NOT NULL,
  `productId`      VARCHAR(191) NOT NULL,
  `customerId`     VARCHAR(191) NOT NULL,
  `orderItemId`    VARCHAR(191) NULL,
  `rating`         INT          NOT NULL,
  `title`          VARCHAR(191) NULL,
  `body`           TEXT         NULL,
  `photos`         TEXT         NULL,
  `isVerified`     BOOLEAN      NOT NULL DEFAULT false,
  `isAnonymous`    BOOLEAN      NOT NULL DEFAULT false,
  `helpfulCount`   INT          NOT NULL DEFAULT 0,
  `status`         ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `rejectionReason` TEXT        NULL,
  `moderatedById`  VARCHAR(191) NULL,
  `moderatedAt`    DATETIME(3)  NULL,
  `createdAt`      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `product_reviews_customerId_productId_key` (`customerId`, `productId`),
  INDEX `product_reviews_productId_status_idx` (`productId`, `status`),
  INDEX `product_reviews_status_idx` (`status`),
  CONSTRAINT `product_reviews_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `product_reviews_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`)
);

CREATE TABLE `review_helpful_votes` (
  `id`         VARCHAR(191) NOT NULL,
  `reviewId`   VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NOT NULL,
  `createdAt`  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `review_helpful_votes_reviewId_customerId_key` (`reviewId`, `customerId`),
  CONSTRAINT `review_helpful_votes_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `product_reviews`(`id`) ON DELETE CASCADE
);

CREATE TABLE `customer_gallery` (
  `id`           VARCHAR(191) NOT NULL,
  `productId`    VARCHAR(191) NOT NULL,
  `customerId`   VARCHAR(191) NOT NULL,
  `photoUrls`    TEXT         NOT NULL,
  `caption`      TEXT         NULL,
  `isApproved`   BOOLEAN      NOT NULL DEFAULT false,
  `approvedById` VARCHAR(191) NULL,
  `approvedAt`   DATETIME(3)  NULL,
  `createdAt`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `customer_gallery_productId_isApproved_idx` (`productId`, `isApproved`),
  CONSTRAINT `customer_gallery_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_gallery_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`)
);

CREATE TABLE `customer_notification_prefs` (
  `id`                     VARCHAR(191) NOT NULL,
  `customerId`             VARCHAR(191) NOT NULL,
  `orderUpdatesEmail`      BOOLEAN      NOT NULL DEFAULT true,
  `orderUpdatesWhatsapp`   BOOLEAN      NOT NULL DEFAULT false,
  `promotionsEmail`        BOOLEAN      NOT NULL DEFAULT false,
  `promotionsWhatsapp`     BOOLEAN      NOT NULL DEFAULT false,
  `reviewRequestEmail`     BOOLEAN      NOT NULL DEFAULT true,
  `createdAt`              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`              DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_notification_prefs_customerId_key` (`customerId`),
  CONSTRAINT `customer_notification_prefs_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE
);

CREATE TABLE `customer_sessions` (
  `id`          VARCHAR(191) NOT NULL,
  `customerId`  VARCHAR(191) NOT NULL,
  `tokenHash`   VARCHAR(64)  NOT NULL,
  `expiresAt`   DATETIME(3)  NOT NULL,
  `isRevoked`   BOOLEAN      NOT NULL DEFAULT false,
  `ip`          VARCHAR(191) NULL,
  `userAgent`   TEXT         NULL,
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_sessions_tokenHash_key` (`tokenHash`),
  INDEX `customer_sessions_customerId_idx` (`customerId`),
  CONSTRAINT `customer_sessions_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE
);

-- Add passwordHash column to customers table for real auth (nullable
-- so existing COD-order customers are not disrupted — they simply can't
-- log in until they register a password, which is the correct behaviour).
ALTER TABLE `customers`
  ADD COLUMN `passwordHash` VARCHAR(191) NULL;
