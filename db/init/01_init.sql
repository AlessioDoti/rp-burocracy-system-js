-- 01_init.sql
-- Complete database schema for the burocracy system.
-- Run by the Docker entrypoint (alphabetical order). Numeric prefix
-- sorts after anything starting with a letter, so this file is
-- guaranteed to run before 02_populate.sql.
--
-- Every statement is guarded for idempotency so the script can be
-- re-applied to a populated database without errors.

CREATE DATABASE IF NOT EXISTS burocracy
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE burocracy;

-- ---------------------------------------------------------------------------
-- CATEGORY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS CATEGORY (
    id   BIGINT       AUTO_INCREMENT PRIMARY KEY,
    NAME VARCHAR(255) NOT NULL,
    CONSTRAINT UK_CATEGORY_NAME UNIQUE (NAME)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- CATEGORY_TAXES  (one bracket per row; cascade on parent delete)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS CATEGORY_TAXES (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    AMOUNT      FLOAT  NOT NULL,
    RATE        INT    NOT NULL,
    CATEGORY_ID BIGINT NOT NULL,
    CONSTRAINT FK_CATEGORY_TAXES_CATEGORY
        FOREIGN KEY (CATEGORY_ID) REFERENCES CATEGORY (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- (FK creates an implicit index on CATEGORY_ID; no explicit index needed.)

-- ---------------------------------------------------------------------------
-- ACTIVITY
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ACTIVITY (
    id          BIGINT       AUTO_INCREMENT PRIMARY KEY,
    NAME        VARCHAR(255) NOT NULL,
    ADDRESS     INT          NOT NULL DEFAULT 0,
    CATEGORY_ID BIGINT       NOT NULL,
    CONSTRAINT UK_ACTIVITY_NAME UNIQUE (NAME),
    CONSTRAINT FK_ACTIVITY_CATEGORY
        FOREIGN KEY (CATEGORY_ID) REFERENCES CATEGORY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- (FK creates an implicit index on CATEGORY_ID; no explicit index needed.)

-- ---------------------------------------------------------------------------
-- TAX  (cascade on parent activity delete: deleting an activity wipes
-- every tax declaration filed against it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TAX (
    id                  BIGINT       AUTO_INCREMENT PRIMARY KEY,
    ACTIVITY_ID         BIGINT       NOT NULL,
    MANAGER_NAME        VARCHAR(255) NOT NULL,
    MANAGER_SURNAME     VARCHAR(255) NOT NULL,
    MANAGER_ROLE        VARCHAR(255) NOT NULL,
    EXPENSES            FLOAT        NOT NULL,
    EARNINGS            FLOAT        NOT NULL,
    REVENUE             FLOAT        NOT NULL,
    TAX_AMOUNT          FLOAT        NOT NULL,
    ELAPSED_DAYS        INT          NOT NULL,
    ELAPSED_BILL_AMOUNT FLOAT        NOT NULL,
    TAXABLE_INCOME      FLOAT        NOT NULL,
    DECLARATION_DATE    DATETIME     NOT NULL,
    PAYED               TINYINT(1)   NOT NULL DEFAULT 0,
    CONSTRAINT FK_TAX_ACTIVITY
        FOREIGN KEY (ACTIVITY_ID) REFERENCES ACTIVITY (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- (FK creates an implicit index on ACTIVITY_ID; no explicit index needed.)

-- ---------------------------------------------------------------------------
-- TAX.DECLARATION_DATE  (idempotent — only used for ORDER BY in getElapsedDays)
-- Note: MySQL 8 does NOT support "CREATE INDEX IF NOT EXISTS"; the only
-- portable way to make this idempotent is a guarded PREPARE/EXECUTE.
-- ---------------------------------------------------------------------------
SET @idx_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'TAX'
      AND INDEX_NAME   = 'IDX_TAX_DECLARATION_DATE'
);
SET @sql := IF(
    @idx_exists = 0,
    'CREATE INDEX IDX_TAX_DECLARATION_DATE ON TAX (DECLARATION_DATE)',
    'SELECT ''index IDX_TAX_DECLARATION_DATE already present, skipping'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
