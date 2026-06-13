-- 01_init.sql
-- Complete database schema for the burocracy system.

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

-- ---------------------------------------------------------------------------
-- ACTIVITIES_EMPLOYEES  (many-to-many between ACTIVITY and person UUIDs)
-- Each employee is identified by their external UUID (from the person
-- microservice) and assigned a role in the context of the activity.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ACTIVITIES_EMPLOYEES (
    id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
    ACTIVITY_ID   BIGINT       NOT NULL,
    EMPLOYEE_UID  VARCHAR(36)  NOT NULL,
    ROLE          VARCHAR(50)  NOT NULL,
    CONSTRAINT FK_AE_ACTIVITY
        FOREIGN KEY (ACTIVITY_ID) REFERENCES ACTIVITY (id)
        ON DELETE CASCADE,
    CONSTRAINT UK_AE_ACTIVITY_EMPLOYEE UNIQUE (ACTIVITY_ID, EMPLOYEE_UID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @idx_ae_exists := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'ACTIVITIES_EMPLOYEES'
      AND INDEX_NAME   = 'IDX_AE_EMPLOYEE_UID'
);
SET @sql_ae := IF(
    @idx_ae_exists = 0,
    'CREATE INDEX IDX_AE_EMPLOYEE_UID ON ACTIVITIES_EMPLOYEES (EMPLOYEE_UID)',
    'SELECT ''index IDX_AE_EMPLOYEE_UID already present, skipping'' AS info'
);
PREPARE stmt_ae FROM @sql_ae; EXECUTE stmt_ae; DEALLOCATE PREPARE stmt_ae;

-- ---------------------------------------------------------------------------
-- TAX  (cascade on parent activity delete)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TAX (
    id                  BIGINT       AUTO_INCREMENT PRIMARY KEY,
    ACTIVITY_ID         BIGINT       NOT NULL,
    PERSON_UUID         VARCHAR(36)  NOT NULL,
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

-- ---------------------------------------------------------------------------
-- TAX.DECLARATION_DATE index
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
