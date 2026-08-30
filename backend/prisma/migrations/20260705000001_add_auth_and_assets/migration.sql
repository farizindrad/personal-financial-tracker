-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill: akun pemilik untuk seluruh data existing sebelum kolom user_id jadi NOT NULL.
INSERT INTO `users` (`email`, `password_hash`, `name`)
VALUES ('owner@ledger.local', '$2a$10$0000000000000000000000000000000000000000000000000000000000', 'Owner')
ON DUPLICATE KEY UPDATE `email` = `email`;

SET @owner_id = (SELECT `id` FROM `users` WHERE `email` = 'owner@ledger.local' LIMIT 1);

-- CreateTable (dengan kolom user_id nullable dulu, di-backfill, lalu NOT NULL)
ALTER TABLE `accounts` ADD COLUMN `user_id` INTEGER NULL;
ALTER TABLE `categories` ADD COLUMN `user_id` INTEGER NULL;
ALTER TABLE `transactions` ADD COLUMN `user_id` INTEGER NULL;
ALTER TABLE `budgets` ADD COLUMN `user_id` INTEGER NULL;
ALTER TABLE `savings_goals` ADD COLUMN `user_id` INTEGER NULL;
ALTER TABLE `recurring_transactions` ADD COLUMN `user_id` INTEGER NULL;

-- Backfill semua baris existing ke owner
UPDATE `accounts` SET `user_id` = @owner_id WHERE `user_id` IS NULL;
UPDATE `categories` SET `user_id` = @owner_id WHERE `user_id` IS NULL;
UPDATE `transactions` SET `user_id` = @owner_id WHERE `user_id` IS NULL;
UPDATE `budgets` SET `user_id` = @owner_id WHERE `user_id` IS NULL;
UPDATE `savings_goals` SET `user_id` = @owner_id WHERE `user_id` IS NULL;
UPDATE `recurring_transactions` SET `user_id` = @owner_id WHERE `user_id` IS NULL;

-- NOT NULL + FK
ALTER TABLE `accounts` MODIFY COLUMN `user_id` INTEGER NOT NULL;
ALTER TABLE `categories` MODIFY COLUMN `user_id` INTEGER NOT NULL;
ALTER TABLE `transactions` MODIFY COLUMN `user_id` INTEGER NOT NULL;
ALTER TABLE `budgets` MODIFY COLUMN `user_id` INTEGER NOT NULL;
ALTER TABLE `savings_goals` MODIFY COLUMN `user_id` INTEGER NOT NULL;
ALTER TABLE `recurring_transactions` MODIFY COLUMN `user_id` INTEGER NOT NULL;

-- CreateTable: assets & liabilities
CREATE TABLE `assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('property', 'vehicle', 'investment', 'gold', 'cash', 'other') NOT NULL DEFAULT 'other',
    `value` DECIMAL(15, 2) NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_asset_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `liabilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `type` ENUM('credit_card', 'loan', 'other') NOT NULL DEFAULT 'other',
    `amount` DECIMAL(15, 2) NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_liability_user`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indeks
CREATE INDEX `idx_account_user` ON `accounts`(`user_id`);
CREATE INDEX `idx_category_user` ON `categories`(`user_id`);
CREATE INDEX `idx_trx_user` ON `transactions`(`user_id`);
CREATE INDEX `idx_budget_user` ON `budgets`(`user_id`);
CREATE INDEX `idx_goal_user` ON `savings_goals`(`user_id`);
CREATE INDEX `idx_recurring_user` ON `recurring_transactions`(`user_id`);

-- Unique scope per user (ganti yang global)
-- FK budgets_category_id_fkey butuh index di category_id, jadi drop FK dulu lalu dibuat ulang.
ALTER TABLE `budgets` DROP FOREIGN KEY `budgets_category_id_fkey`;
DROP INDEX `uq_category_name_type` ON `categories`;
DROP INDEX `uq_budget_period` ON `budgets`;
CREATE UNIQUE INDEX `uq_category_name_type` ON `categories`(`user_id`, `name`, `type`);
CREATE UNIQUE INDEX `uq_budget_period` ON `budgets`(`user_id`, `category_id`, `month`, `year`);
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign keys
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `categories` ADD CONSTRAINT `categories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `savings_goals` ADD CONSTRAINT `savings_goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `recurring_transactions` ADD CONSTRAINT `recurring_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `assets` ADD CONSTRAINT `assets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `liabilities` ADD CONSTRAINT `liabilities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop & recreate view dengan scope user
DROP VIEW `v_account_balances`;
CREATE VIEW `v_account_balances` AS
SELECT
    a.id AS account_id,
    a.name AS account_name,
    a.type AS account_type,
    a.user_id AS user_id,
    a.initial_balance
    + COALESCE(SUM(
        CASE
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
            ELSE 0
        END
      ), 0)
    + COALESCE((
        SELECT SUM(t2.amount)
        FROM transactions t2
        WHERE t2.transfer_to_account_id = a.id
      ), 0) AS current_balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id, a.name, a.type, a.user_id, a.initial_balance;
