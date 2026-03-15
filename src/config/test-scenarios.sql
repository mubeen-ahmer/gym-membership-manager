-- ============================================================
-- GYM SYSTEM - TEST SCENARIOS DATA
-- Run this in Supabase SQL Editor AFTER running schema.sql
-- This REPLACES seed.sql — run one or the other, not both.
--
-- Today's date assumed: 2026-03-15
-- ============================================================

-- Clean existing data (run in order due to foreign keys)
DELETE FROM membership_violations;
DELETE FROM attendance;
DELETE FROM payments;
DELETE FROM membership_months;
DELETE FROM subscriptions;
DELETE FROM members;
DELETE FROM membership_plans;

-- ===================== PLANS (same as before) =====================
INSERT INTO membership_plans (plan_id, plan_name, duration_months, plan_class, default_price_pkr) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'Monthly',     1,  'Class 1 - Machines Only',        2000),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'Quarterly',   3,  'Class 1 - Machines Only',        5500),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'Half-Yearly', 6,  'Class 1 - Machines Only',       10000),
  ('a1b2c3d4-0001-0001-0001-000000000004', 'Yearly',      12, 'Class 1 - Machines Only',       18000),
  ('a1b2c3d4-0002-0002-0002-000000000005', 'Monthly',     1,  'Class 2 - Machines + Electric',  3000),
  ('a1b2c3d4-0002-0002-0002-000000000006', 'Quarterly',   3,  'Class 2 - Machines + Electric',  8000),
  ('a1b2c3d4-0002-0002-0002-000000000007', 'Half-Yearly', 6,  'Class 2 - Machines + Electric', 15000),
  ('a1b2c3d4-0002-0002-0002-000000000008', 'Yearly',      12, 'Class 2 - Machines + Electric', 27000);


-- ===================== MEMBERS =====================
INSERT INTO members (member_id, name, phone_number, join_date, status) VALUES
  -- SCENARIO 1: Fully paid, active monthly
  ('GYM-MEMBER-000101', 'Aamir Khan',       '+923001111101', '2026-03-01', 'active'),
  -- SCENARIO 2: Quarterly plan, paid all 3 months upfront
  ('GYM-MEMBER-000102', 'Babar Azam',       '+923001111102', '2026-01-15', 'active'),
  -- SCENARIO 3: Quarterly plan, paid only 1 of 3 months (2 unpaid)
  ('GYM-MEMBER-000103', 'Chahal Singh',     '+923001111103', '2026-01-10', 'active'),
  -- SCENARIO 4: Half-yearly plan, paid 0 months (joined but never paid)
  ('GYM-MEMBER-000104', 'Danish Ali',       '+923001111104', '2026-01-01', 'active'),
  -- SCENARIO 5: Yearly plan, paid 3 of 12 months (9 unpaid)
  ('GYM-MEMBER-000105', 'Ehsan Ullah',      '+923001111105', '2025-06-01', 'active'),
  -- SCENARIO 6: Monthly expired 10 days ago, still attending (overdue + violations)
  ('GYM-MEMBER-000106', 'Fahad Raza',       '+923001111106', '2026-02-01', 'active'),
  -- SCENARIO 7: Quarterly expired 45 days ago, 3 violations recorded
  ('GYM-MEMBER-000107', 'Ghulam Abbas',     '+923001111107', '2025-10-01', 'active'),
  -- SCENARIO 8: Monthly active, expires tomorrow (edge case)
  ('GYM-MEMBER-000108', 'Haris Iqbal',      '+923001111108', '2026-02-16', 'active'),
  -- SCENARIO 9: Inactive member with old expired subscription
  ('GYM-MEMBER-000109', 'Irfan Patel',      '+923001111109', '2025-06-01', 'inactive'),
  -- SCENARIO 10: Multiple past subscriptions, currently on unpaid quarterly
  ('GYM-MEMBER-000110', 'Junaid Qureshi',   '+923001111110', '2025-01-01', 'active');


-- ====================================================================
-- SCENARIO 1: Aamir — Monthly Class 1, fully paid, currently active
-- Plan: Monthly 2000 PKR, started Mar 1, ends Mar 31
-- Expected: 1 paid month, membership active, no issues
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('11111111-0001-0001-0001-000000000001', 'GYM-MEMBER-000101', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-03-01', '2026-03-31', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000101', '11111111-0001-0001-0001-000000000001', '2026-03', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000101', '11111111-0001-0001-0001-000000000001', 2000, '2026-03-01', 'cash');


-- ====================================================================
-- SCENARIO 2: Babar — Quarterly Class 2, ALL 3 months paid upfront
-- Plan: Quarterly 8000 PKR, started Jan 15, ends Apr 14
-- Expected: 3 paid months, membership active, no unpaid
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('22222222-0002-0002-0002-000000000002', 'GYM-MEMBER-000102', 'a1b2c3d4-0002-0002-0002-000000000006', '2026-01-15', '2026-04-14', 8000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000102', '22222222-0002-0002-0002-000000000002', '2026-01', 'paid'),
  ('GYM-MEMBER-000102', '22222222-0002-0002-0002-000000000002', '2026-02', 'paid'),
  ('GYM-MEMBER-000102', '22222222-0002-0002-0002-000000000002', '2026-03', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000102', '22222222-0002-0002-0002-000000000002', 8000, '2026-01-15', 'bank_transfer');


-- ====================================================================
-- SCENARIO 3: Chahal — Quarterly Class 1, paid only 1 of 3 months
-- Plan: Quarterly 5500 PKR, started Jan 10, ends Apr 9
-- Expected: 1 paid, 2 UNPAID → settle dues should allow paying 1 or 2
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('33333333-0003-0003-0003-000000000003', 'GYM-MEMBER-000103', 'a1b2c3d4-0001-0001-0001-000000000002', '2026-01-10', '2026-04-09', 5500);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000103', '33333333-0003-0003-0003-000000000003', '2026-01', 'paid'),
  ('GYM-MEMBER-000103', '33333333-0003-0003-0003-000000000003', '2026-02', 'unpaid'),
  ('GYM-MEMBER-000103', '33333333-0003-0003-0003-000000000003', '2026-03', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000103', '33333333-0003-0003-0003-000000000003', 1833, '2026-01-10', 'cash');


-- ====================================================================
-- SCENARIO 4: Danish — Half-Yearly Class 2, joined but PAID NOTHING
-- Plan: Half-Yearly 15000 PKR, started Jan 1, ends Jun 30
-- Expected: 0 paid, 6 UNPAID → settle dues should let admin pay any count
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('44444444-0004-0004-0004-000000000004', 'GYM-MEMBER-000104', 'a1b2c3d4-0002-0002-0002-000000000007', '2026-01-01', '2026-06-30', 15000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000104', '44444444-0004-0004-0004-000000000004', '2026-01', 'unpaid'),
  ('GYM-MEMBER-000104', '44444444-0004-0004-0004-000000000004', '2026-02', 'unpaid'),
  ('GYM-MEMBER-000104', '44444444-0004-0004-0004-000000000004', '2026-03', 'unpaid'),
  ('GYM-MEMBER-000104', '44444444-0004-0004-0004-000000000004', '2026-04', 'unpaid'),
  ('GYM-MEMBER-000104', '44444444-0004-0004-0004-000000000004', '2026-05', 'unpaid'),
  ('GYM-MEMBER-000104', '44444444-0004-0004-0004-000000000004', '2026-06', 'unpaid');

-- No payment record at all for Danish


-- ====================================================================
-- SCENARIO 5: Ehsan — Yearly Class 1, paid 3 of 12 months (9 unpaid)
-- Plan: Yearly 18000 PKR, started Jun 1 2025, ends May 31 2026
-- Expected: 3 paid (Jun-Aug), 9 UNPAID (Sep 2025 - May 2026)
--           Membership still active. Admin can settle partial dues.
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('55555555-0005-0005-0005-000000000005', 'GYM-MEMBER-000105', 'a1b2c3d4-0001-0001-0001-000000000004', '2025-06-01', '2026-05-31', 18000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2025-06', 'paid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2025-07', 'paid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2025-08', 'paid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2025-09', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2025-10', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2025-11', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2025-12', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2026-01', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2026-02', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2026-03', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2026-04', 'unpaid'),
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', '2026-05', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000105', '55555555-0005-0005-0005-000000000005', 4500, '2025-06-01', 'cash');


-- ====================================================================
-- SCENARIO 6: Fahad — Monthly EXPIRED 10 days ago, overdue attendance
-- Plan: Monthly 3000 PKR (Class 2), started Feb 1, ended Mar 2
-- Expected: membership expired, 10+ overdue days, violations exist
--           "Renew & Pay" button should appear. Settle dues won't help
--           because he needs a NEW plan, not settling old months.
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('66666666-0006-0006-0006-000000000006', 'GYM-MEMBER-000106', 'a1b2c3d4-0002-0002-0002-000000000005', '2026-02-01', '2026-03-02', 3000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000106', '66666666-0006-0006-0006-000000000006', '2026-02', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000106', '66666666-0006-0006-0006-000000000006', 3000, '2026-02-01', 'cash');

-- Fahad kept attending after expiry
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000106', '2026-03-03 09:00:00+05', '2026-03-03', 'barcode', true),
  ('GYM-MEMBER-000106', '2026-03-05 10:00:00+05', '2026-03-05', 'manual',  true),
  ('GYM-MEMBER-000106', '2026-03-07 09:30:00+05', '2026-03-07', 'barcode', true),
  ('GYM-MEMBER-000106', '2026-03-10 08:00:00+05', '2026-03-10', 'barcode', true),
  ('GYM-MEMBER-000106', '2026-03-12 09:00:00+05', '2026-03-12', 'manual',  true),
  ('GYM-MEMBER-000106', '2026-03-14 10:30:00+05', '2026-03-14', 'barcode', true);

INSERT INTO membership_violations (member_id, subscription_id, overdue_days, recorded_date) VALUES
  ('GYM-MEMBER-000106', '66666666-0006-0006-0006-000000000006', 12, '2026-03-14');


-- ====================================================================
-- SCENARIO 7: Ghulam — Quarterly EXPIRED 45+ days ago, 3 violations
-- Plan: Quarterly 8000 PKR (Class 2), started Oct 1, ended Dec 30 2025
-- Expected: long-expired, multiple violations, needs renewal
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('77777777-0007-0007-0007-000000000007', 'GYM-MEMBER-000107', 'a1b2c3d4-0002-0002-0002-000000000006', '2025-10-01', '2025-12-30', 8000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000107', '77777777-0007-0007-0007-000000000007', '2025-10', 'paid'),
  ('GYM-MEMBER-000107', '77777777-0007-0007-0007-000000000007', '2025-11', 'paid'),
  ('GYM-MEMBER-000107', '77777777-0007-0007-0007-000000000007', '2025-12', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000107', '77777777-0007-0007-0007-000000000007', 8000, '2025-10-01', 'bank_transfer');

INSERT INTO membership_violations (member_id, subscription_id, overdue_days, recorded_date) VALUES
  ('GYM-MEMBER-000107', '77777777-0007-0007-0007-000000000007', 10, '2026-01-10'),
  ('GYM-MEMBER-000107', '77777777-0007-0007-0007-000000000007', 20, '2026-01-20'),
  ('GYM-MEMBER-000107', '77777777-0007-0007-0007-000000000007', 45, '2026-02-14');

INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000107', '2026-01-05 08:00:00+05', '2026-01-05', 'manual', true),
  ('GYM-MEMBER-000107', '2026-01-15 09:00:00+05', '2026-01-15', 'manual', true),
  ('GYM-MEMBER-000107', '2026-02-01 10:00:00+05', '2026-02-01', 'manual', true);


-- ====================================================================
-- SCENARIO 8: Haris — Monthly active, EXPIRES TOMORROW (edge case)
-- Plan: Monthly 2000 PKR, started Feb 16, ends Mar 16
-- Expected: membership active today, will be expired tomorrow
--           Good for testing the boundary condition
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('88888888-0008-0008-0008-000000000008', 'GYM-MEMBER-000108', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-02-16', '2026-03-16', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000108', '88888888-0008-0008-0008-000000000008', '2026-02', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000108', '88888888-0008-0008-0008-000000000008', 2000, '2026-02-16', 'cash');

-- Haris has been attending regularly
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000108', '2026-03-10 07:00:00+05', '2026-03-10', 'barcode', false),
  ('GYM-MEMBER-000108', '2026-03-12 07:30:00+05', '2026-03-12', 'barcode', false),
  ('GYM-MEMBER-000108', '2026-03-14 08:00:00+05', '2026-03-14', 'barcode', false),
  ('GYM-MEMBER-000108', '2026-03-15 07:00:00+05', '2026-03-15', 'barcode', false);


-- ====================================================================
-- SCENARIO 9: Irfan — Inactive, old expired sub, no recent activity
-- Plan: Monthly 2000 PKR, started Jun 1 2025, ended Jun 30 2025
-- Expected: inactive status, old expired plan, no recent data
-- ====================================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('99999999-0009-0009-0009-000000000009', 'GYM-MEMBER-000109', 'a1b2c3d4-0001-0001-0001-000000000001', '2025-06-01', '2025-06-30', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000109', '99999999-0009-0009-0009-000000000009', '2025-06', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000109', '99999999-0009-0009-0009-000000000009', 2000, '2025-06-01', 'cash');


-- ====================================================================
-- SCENARIO 10: Junaid — Multiple subscriptions history + current unpaid
-- Past: Monthly (Jul 2025, paid), Quarterly (Aug-Oct 2025, paid)
-- Current: Quarterly Class 2, started Jan 2026, paid 1 of 3 months
-- Expected: rich payment history, 2 current unpaid months, violations
-- ====================================================================

-- Past subscription 1: Monthly Jul 2025
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('aaaaaaaa-000a-000a-000a-00000000000a', 'GYM-MEMBER-000110', 'a1b2c3d4-0001-0001-0001-000000000001', '2025-07-01', '2025-07-31', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000110', 'aaaaaaaa-000a-000a-000a-00000000000a', '2025-07', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000110', 'aaaaaaaa-000a-000a-000a-00000000000a', 2000, '2025-07-01', 'cash');

-- Past subscription 2: Quarterly Aug-Oct 2025
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('bbbbbbbb-000b-000b-000b-00000000000b', 'GYM-MEMBER-000110', 'a1b2c3d4-0001-0001-0001-000000000002', '2025-08-01', '2025-10-31', 5500);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000110', 'bbbbbbbb-000b-000b-000b-00000000000b', '2025-08', 'paid'),
  ('GYM-MEMBER-000110', 'bbbbbbbb-000b-000b-000b-00000000000b', '2025-09', 'paid'),
  ('GYM-MEMBER-000110', 'bbbbbbbb-000b-000b-000b-00000000000b', '2025-10', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000110', 'bbbbbbbb-000b-000b-000b-00000000000b', 5500, '2025-08-01', 'bank_transfer');

-- Gap: Nov 2025 - Dec 2025 (Junaid left for 2 months)

-- Current subscription: Quarterly Class 2, Jan 2026, paid only month 1
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('cccccccc-000c-000c-000c-00000000000c', 'GYM-MEMBER-000110', 'a1b2c3d4-0002-0002-0002-000000000006', '2026-01-01', '2026-03-31', 8000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000110', 'cccccccc-000c-000c-000c-00000000000c', '2026-01', 'paid'),
  ('GYM-MEMBER-000110', 'cccccccc-000c-000c-000c-00000000000c', '2026-02', 'unpaid'),
  ('GYM-MEMBER-000110', 'cccccccc-000c-000c-000c-00000000000c', '2026-03', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000110', 'cccccccc-000c-000c-000c-00000000000c', 2667, '2026-01-01', 'cash');

-- Violation because he's behind on payments
INSERT INTO membership_violations (member_id, subscription_id, overdue_days, recorded_date) VALUES
  ('GYM-MEMBER-000110', 'cccccccc-000c-000c-000c-00000000000c', 30, '2026-03-01');


-- ====================================================================
-- ATTENDANCE FOR TODAY (Mar 15) — mixed members
-- ====================================================================
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000101', NOW() - INTERVAL '30 minutes',  CURRENT_DATE, 'barcode', false),
  ('GYM-MEMBER-000102', NOW() - INTERVAL '45 minutes',  CURRENT_DATE, 'manual',  false),
  ('GYM-MEMBER-000103', NOW() - INTERVAL '60 minutes',  CURRENT_DATE, 'barcode', false),
  ('GYM-MEMBER-000105', NOW() - INTERVAL '90 minutes',  CURRENT_DATE, 'manual',  false),
  ('GYM-MEMBER-000110', NOW() - INTERVAL '120 minutes', CURRENT_DATE, 'barcode', false);

-- Yesterday's attendance
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000101', NOW() - INTERVAL '1 day 1 hour',    CURRENT_DATE - 1, 'barcode', false),
  ('GYM-MEMBER-000102', NOW() - INTERVAL '1 day 2 hours',   CURRENT_DATE - 1, 'manual',  false),
  ('GYM-MEMBER-000103', NOW() - INTERVAL '1 day 3 hours',   CURRENT_DATE - 1, 'barcode', false),
  ('GYM-MEMBER-000104', NOW() - INTERVAL '1 day 2 hours',   CURRENT_DATE - 1, 'manual',  false),
  ('GYM-MEMBER-000105', NOW() - INTERVAL '1 day 90 mins',   CURRENT_DATE - 1, 'barcode', false);


-- ====================================================================
-- QUICK SCENARIO REFERENCE (for testing)
-- ====================================================================
-- MEMBER 101 (Aamir)   → Active monthly, fully paid. Happy path.
-- MEMBER 102 (Babar)   → Active quarterly, all paid. No issues.
-- MEMBER 103 (Chahal)  → Active quarterly, 2 unpaid months. Test "Settle Dues" for 1 or 2 months.
-- MEMBER 104 (Danish)  → Active half-yearly, ALL 6 unpaid. Test settling 1-6 months.
-- MEMBER 105 (Ehsan)   → Active yearly, 9 unpaid. Test large partial settlement.
-- MEMBER 106 (Fahad)   → EXPIRED monthly + overdue attendance + violation. Test "Renew & Pay".
-- MEMBER 107 (Ghulam)  → EXPIRED quarterly 45+ days, 3 violations. Test renew + auto-clear violations.
-- MEMBER 108 (Haris)   → Active monthly, expires TOMORROW. Edge case for boundary.
-- MEMBER 109 (Irfan)   → Inactive, old expired. Test inactive member view.
-- MEMBER 110 (Junaid)  → Multiple subs history, current with 2 unpaid + violation. Full payment history test.
