-- 02_populate.sql
-- Mock data for development. Run by the Docker entrypoint AFTER
-- 01_init.sql. Every insert is idempotent (INSERT IGNORE) so the
-- script can be re-applied to a populated database without errors
-- and without producing duplicate rows.
--
-- NOTE: the IDs below are pinned so the same row appears with the
-- same id across runs. AUTO_INCREMENT still works for rows inserted
-- through the API.

USE burocracy;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO CATEGORY (id, NAME) VALUES
    (1, 'Retail'),
    (2, 'Manufacturing'),
    (3, 'Services');

-- ---------------------------------------------------------------------------
-- Brackets
-- ---------------------------------------------------------------------------
-- Retail: 10% up to 1k, 15% up to 5k, 25% up to 20k, 35% above.
INSERT IGNORE INTO CATEGORY_TAXES (id, AMOUNT, RATE, CATEGORY_ID) VALUES
    (1,     0, 10, 1),
    (2,  1000, 15, 1),
    (3,  5000, 25, 1),
    (4, 20000, 35, 1);

-- Manufacturing: 8% up to 2k, 12% up to 10k, 22% above.
INSERT IGNORE INTO CATEGORY_TAXES (id, AMOUNT, RATE, CATEGORY_ID) VALUES
    (5,     0,  8, 2),
    (6,  2000, 12, 2),
    (7, 10000, 22, 2);

-- Services: 5% up to 3k, 10% above.
INSERT IGNORE INTO CATEGORY_TAXES (id, AMOUNT, RATE, CATEGORY_ID) VALUES
    (8,    0,  5, 3),
    (9, 3000, 10, 3);

-- ---------------------------------------------------------------------------
-- Activities
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO ACTIVITY (id, NAME, ADDRESS, CATEGORY_ID) VALUES
    (1, 'Main Street Shop', 100, 1),
    (2, 'Online Store',       0, 1),
    (3, 'Factory North',    200, 2),
    (4, 'Consulting LLC',    50, 3);

-- ---------------------------------------------------------------------------
-- Sample tax declarations
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO TAX (
    id, ACTIVITY_ID, MANAGER_NAME, MANAGER_SURNAME, MANAGER_ROLE,
    EXPENSES, EARNINGS, REVENUE, TAX_AMOUNT,
    ELAPSED_DAYS, ELAPSED_BILL_AMOUNT, TAXABLE_INCOME,
    DECLARATION_DATE, PAYED
) VALUES
    -- Shop 1, low bracket, already paid. taxableIncome = 300 × 10 / 100 = 30;
    -- taxAmount = 30 + 0 = 30 (no late-filing penalty).
    (1, 1, 'Alessio', 'Doti',  'MANAGER',
        200,  500,  300,   30, 0, 0, 30,
        NOW() - INTERVAL 30 DAY, 1),

    -- Shop 1, mid bracket, already paid. taxableIncome = 900 × 15 / 100 = 135;
    -- taxAmount = 135 + 0 = 135.
    (2, 1, 'Alessio', 'Doti',  'MANAGER',
        300, 1200,  900,  135, 0, 0, 135,
        NOW() - INTERVAL 15 DAY, 1),

    -- Factory, higher bracket, not yet paid. taxableIncome = 7000 × 12 / 100 = 840;
    -- taxAmount = 840 + 0 = 840.
    (3, 3, 'Mario',   'Rossi', 'MANAGER',
       1000, 8000, 7000,  840, 0, 0, 840,
        NOW() - INTERVAL 7  DAY, 0);
