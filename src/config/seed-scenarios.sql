-- ============================================================
-- GYM SYSTEM - SCENARIO TEST DATA
-- Run this in Supabase SQL Editor AFTER schema.sql
-- WARNING: This DELETES all existing data first!
-- ============================================================

-- ===================== CLEAR EXISTING DATA =====================
DELETE FROM membership_violations;
DELETE FROM attendance;
DELETE FROM payments;
DELETE FROM membership_months;
DELETE FROM subscriptions;
DELETE FROM members;
DELETE FROM membership_plans;

-- ===================== MEMBERSHIP PLANS =====================
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
  ('GYM-MEMBER-000001', 'Ahmed Hassan',      '+923001234567', '2025-01-05', 'active'),
  ('GYM-MEMBER-000002', 'Bilal Akhtar',      '+923111234568', '2026-03-01', 'active'),
  ('GYM-MEMBER-000003', 'Usman Tariq',       '+923211234569', '2026-02-01', 'active'),
  ('GYM-MEMBER-000004', 'Farhan Siddiqui',   '+923311234570', '2025-07-01', 'active'),
  ('GYM-MEMBER-000005', 'Zain Malik',        '+923411234571', '2026-01-15', 'active'),
  ('GYM-MEMBER-000006', 'Hamza Sheikh',      '+923051234572', '2025-11-01', 'active'),
  ('GYM-MEMBER-000007', 'Saad Rehman',       '+923061234573', '2025-09-01', 'active'),
  ('GYM-MEMBER-000008', 'Ali Raza',          '+923071234574', '2026-03-10', 'active'),
  ('GYM-MEMBER-000009', 'Omar Farooq',       '+923081234575', '2026-02-20', 'active'),
  ('GYM-MEMBER-000010', 'Kamran Baig',       '+923091234576', '2025-09-01', 'active'),
  ('GYM-MEMBER-000011', 'Hassan Nawaz',      '+923151234577', '2025-12-15', 'active'),
  ('GYM-MEMBER-000012', 'Imran Chaudhry',    '+923161234578', '2026-02-14', 'active'),
  ('GYM-MEMBER-000013', 'Nabeel Qureshi',    '+923171234579', '2025-06-01', 'inactive'),
  ('GYM-MEMBER-000014', 'Shahzaib Khan',     '+923181234580', '2026-01-01', 'active'),
  ('GYM-MEMBER-000015', 'Talha Javed',       '+923191234581', '2025-10-01', 'active');


-- ============================================================
-- SCENARIO 1: FULLY PAID ACTIVE MEMBER
-- Ahmed Hassan - Yearly Class 2, Jan 5 2025 → Jan 4 2026
-- All 12 months paid. COMPLETED subscription. 
-- Then renewed Monthly Class 2 starting Feb 2026, paid.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('10000001-aaaa-aaaa-aaaa-000000000001', 'GYM-MEMBER-000001', 'a1b2c3d4-0002-0002-0002-000000000008', '2025-01-05', '2026-01-04', 27000),
  ('10000001-aaaa-aaaa-aaaa-000000000002', 'GYM-MEMBER-000001', 'a1b2c3d4-0002-0002-0002-000000000005', '2026-02-01', '2026-02-28', 3000),
  ('10000001-aaaa-aaaa-aaaa-000000000003', 'GYM-MEMBER-000001', 'a1b2c3d4-0002-0002-0002-000000000005', '2026-03-01', '2026-03-31', 3000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-01', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-02', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-03', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-04', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-05', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-06', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-07', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-08', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-09', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-10', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-11', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', '2025-12', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000002', '2026-02', 'paid'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000003', '2026-03', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000001', 27000, '2025-01-05', 'bank_transfer'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000002', 3000,  '2026-02-01', 'cash'),
  ('GYM-MEMBER-000001', '10000001-aaaa-aaaa-aaaa-000000000003', 3000,  '2026-03-01', 'cash');


-- ============================================================
-- SCENARIO 2: PAY-LATER (0 months paid on signup)
-- Bilal Akhtar - Quarterly Class 1, Mar 1 → May 31, 2026
-- Joined today, will pay later. All 3 months unpaid.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('20000002-bbbb-bbbb-bbbb-000000000001', 'GYM-MEMBER-000002', 'a1b2c3d4-0001-0001-0001-000000000002', '2026-03-01', '2026-05-31', 5500);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000002', '20000002-bbbb-bbbb-bbbb-000000000001', '2026-03', 'unpaid'),
  ('GYM-MEMBER-000002', '20000002-bbbb-bbbb-bbbb-000000000001', '2026-04', 'unpaid'),
  ('GYM-MEMBER-000002', '20000002-bbbb-bbbb-bbbb-000000000001', '2026-05', 'unpaid');
-- No payment records for this member


-- ============================================================
-- SCENARIO 3: PARTIAL PAYMENT (1 of 3 months paid)
-- Usman Tariq - Quarterly Class 2, Feb 1 → Apr 30, 2026
-- Paid 1 month upfront. 2 months still unpaid.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('30000003-cccc-cccc-cccc-000000000001', 'GYM-MEMBER-000003', 'a1b2c3d4-0002-0002-0002-000000000006', '2026-02-01', '2026-04-30', 8000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000003', '30000003-cccc-cccc-cccc-000000000001', '2026-02', 'paid'),
  ('GYM-MEMBER-000003', '30000003-cccc-cccc-cccc-000000000001', '2026-03', 'unpaid'),
  ('GYM-MEMBER-000003', '30000003-cccc-cccc-cccc-000000000001', '2026-04', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000003', '30000003-cccc-cccc-cccc-000000000001', 2667, '2026-02-01', 'cash');


-- ============================================================
-- SCENARIO 4: EXPIRED 2+ MONTHS, LAST MONTHS NEVER PAID
-- Farhan Siddiqui - Half-Yearly Class 1, Jul 1 → Dec 31, 2025
-- Months 1-3 paid, months 4-6 unpaid. Expired ~75 days ago.
-- Still attending gym with overdue status.
-- Has violation recorded.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('40000004-dddd-dddd-dddd-000000000001', 'GYM-MEMBER-000004', 'a1b2c3d4-0001-0001-0001-000000000003', '2025-07-01', '2025-12-31', 10000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', '2025-07', 'paid'),
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', '2025-08', 'paid'),
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', '2025-09', 'paid'),
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', '2025-10', 'unpaid'),
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', '2025-11', 'unpaid'),
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', '2025-12', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', 5000, '2025-07-01', 'cash');

INSERT INTO membership_violations (member_id, subscription_id, overdue_days, recorded_date) VALUES
  ('GYM-MEMBER-000004', '40000004-dddd-dddd-dddd-000000000001', 75, '2026-03-15');


-- ============================================================
-- SCENARIO 5: HAS VIOLATIONS - SHOULD CLEAR WHEN DUES SETTLED
-- Zain Malik - Monthly Class 2, Jan 15 → Feb 14, 2026
-- 1 month unpaid. Expired ~30 days ago.
-- Has violation. Test: settling dues should clear violation.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('50000005-eeee-eeee-eeee-000000000001', 'GYM-MEMBER-000005', 'a1b2c3d4-0002-0002-0002-000000000005', '2026-01-15', '2026-02-14', 3000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000005', '50000005-eeee-eeee-eeee-000000000001', '2026-01', 'unpaid');

INSERT INTO membership_violations (member_id, subscription_id, overdue_days, recorded_date) VALUES
  ('GYM-MEMBER-000005', '50000005-eeee-eeee-eeee-000000000001', 30, '2026-03-15');


-- ============================================================
-- SCENARIO 6: MULTIPLE SUBSCRIPTIONS (renewal history)
-- Hamza Sheikh - Renewed monthly 5 times.
-- Shows payment history across multiple plans.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('60000006-ffff-ffff-ffff-000000000001', 'GYM-MEMBER-000006', 'a1b2c3d4-0001-0001-0001-000000000001', '2025-11-01', '2025-11-30', 2000),
  ('60000006-ffff-ffff-ffff-000000000002', 'GYM-MEMBER-000006', 'a1b2c3d4-0001-0001-0001-000000000001', '2025-12-01', '2025-12-31', 2000),
  ('60000006-ffff-ffff-ffff-000000000003', 'GYM-MEMBER-000006', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-01-01', '2026-01-31', 2000),
  ('60000006-ffff-ffff-ffff-000000000004', 'GYM-MEMBER-000006', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-02-01', '2026-02-28', 2000),
  ('60000006-ffff-ffff-ffff-000000000005', 'GYM-MEMBER-000006', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-03-01', '2026-03-31', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000001', '2025-11', 'paid'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000002', '2025-12', 'paid'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000003', '2026-01', 'paid'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000004', '2026-02', 'paid'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000005', '2026-03', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000001', 2000, '2025-11-01', 'cash'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000002', 2000, '2025-12-01', 'cash'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000003', 2000, '2026-01-01', 'cash'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000004', 2000, '2026-02-01', 'cash'),
  ('GYM-MEMBER-000006', '60000006-ffff-ffff-ffff-000000000005', 2000, '2026-03-01', 'cash');


-- ============================================================
-- SCENARIO 7: PAID SOME MONTHS THEN STOPPED
-- Saad Rehman - Yearly Class 1, Sep 1, 2025 → Aug 31, 2026
-- Months 1-6 paid (Sep-Feb), months 7-12 unpaid (Mar-Aug).
-- Currently in month 7 (March) which is unpaid.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('70000007-1111-1111-1111-000000000001', 'GYM-MEMBER-000007', 'a1b2c3d4-0001-0001-0001-000000000004', '2025-09-01', '2026-08-31', 18000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2025-09', 'paid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2025-10', 'paid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2025-11', 'paid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2025-12', 'paid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-01', 'paid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-02', 'paid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-03', 'unpaid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-04', 'unpaid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-05', 'unpaid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-06', 'unpaid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-07', 'unpaid'),
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', '2026-08', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000007', '70000007-1111-1111-1111-000000000001', 9000, '2025-09-01', 'bank_transfer');


-- ============================================================
-- SCENARIO 8: BRAND NEW MEMBER (just started 5 days ago)
-- Ali Raza - Monthly Class 2, Mar 10 → Apr 9, 2026
-- 1 month paid. Only a few days of attendance.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('80000008-2222-2222-2222-000000000001', 'GYM-MEMBER-000008', 'a1b2c3d4-0002-0002-0002-000000000005', '2026-03-10', '2026-04-09', 3000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000008', '80000008-2222-2222-2222-000000000001', '2026-03', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000008', '80000008-2222-2222-2222-000000000001', 3000, '2026-03-10', 'cash');


-- ============================================================
-- SCENARIO 9: ABOUT TO EXPIRE (4 days left)
-- Omar Farooq - Monthly Class 1, Feb 20 → Mar 19, 2026
-- Paid. Membership expiring in ~4 days from Mar 15.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('90000009-3333-3333-3333-000000000001', 'GYM-MEMBER-000009', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-02-20', '2026-03-19', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000009', '90000009-3333-3333-3333-000000000001', '2026-02', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000009', '90000009-3333-3333-3333-000000000001', 2000, '2026-02-20', 'cash');


-- ============================================================
-- SCENARIO 10: LONG OVERDUE (3+ months expired, no renewal)
-- Kamran Baig - Quarterly Class 2, Sep 1 → Nov 30, 2025
-- All 3 months paid at start. Expired ~105 days ago.
-- Admin never deactivated. Has violation.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('a0000010-4444-4444-4444-000000000001', 'GYM-MEMBER-000010', 'a1b2c3d4-0002-0002-0002-000000000006', '2025-09-01', '2025-11-30', 8000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000010', 'a0000010-4444-4444-4444-000000000001', '2025-09', 'paid'),
  ('GYM-MEMBER-000010', 'a0000010-4444-4444-4444-000000000001', '2025-10', 'paid'),
  ('GYM-MEMBER-000010', 'a0000010-4444-4444-4444-000000000001', '2025-11', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000010', 'a0000010-4444-4444-4444-000000000001', 8000, '2025-09-01', 'cash');

INSERT INTO membership_violations (member_id, subscription_id, overdue_days, recorded_date) VALUES
  ('GYM-MEMBER-000010', 'a0000010-4444-4444-4444-000000000001', 105, '2026-03-15');


-- ============================================================
-- SCENARIO 11: ACTIVE, HALFWAY THROUGH (mid-plan)
-- Hassan Nawaz - Half-Yearly Class 2, Dec 15, 2025 → Jun 14, 2026
-- Months 1-3 paid, months 4-6 unpaid. Currently in month 4.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('b0000011-5555-5555-5555-000000000001', 'GYM-MEMBER-000011', 'a1b2c3d4-0002-0002-0002-000000000007', '2025-12-15', '2026-06-14', 15000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000011', 'b0000011-5555-5555-5555-000000000001', '2025-12', 'paid'),
  ('GYM-MEMBER-000011', 'b0000011-5555-5555-5555-000000000001', '2026-01', 'paid'),
  ('GYM-MEMBER-000011', 'b0000011-5555-5555-5555-000000000001', '2026-02', 'paid'),
  ('GYM-MEMBER-000011', 'b0000011-5555-5555-5555-000000000001', '2026-03', 'unpaid'),
  ('GYM-MEMBER-000011', 'b0000011-5555-5555-5555-000000000001', '2026-04', 'unpaid'),
  ('GYM-MEMBER-000011', 'b0000011-5555-5555-5555-000000000001', '2026-05', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000011', 'b0000011-5555-5555-5555-000000000001', 7500, '2025-12-15', 'bank_transfer');


-- ============================================================
-- SCENARIO 12: EXPIRED YESTERDAY (1 day overdue)
-- Imran Chaudhry - Monthly Class 1, Feb 14 → Mar 14, 2026
-- Paid. Expired yesterday. 1 day overdue.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('c0000012-6666-6666-6666-000000000001', 'GYM-MEMBER-000012', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-02-14', '2026-03-14', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000012', 'c0000012-6666-6666-6666-000000000001', '2026-02', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000012', 'c0000012-6666-6666-6666-000000000001', 2000, '2026-02-14', 'cash');


-- ============================================================
-- SCENARIO 13: INACTIVE MEMBER (old, no recent subscription)
-- Nabeel Qureshi - Had Monthly Class 1 back in Jun 2025.
-- Expired long ago. Status set to inactive.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('d0000013-7777-7777-7777-000000000001', 'GYM-MEMBER-000013', 'a1b2c3d4-0001-0001-0001-000000000001', '2025-06-01', '2025-06-30', 2000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000013', 'd0000013-7777-7777-7777-000000000001', '2025-06', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000013', 'd0000013-7777-7777-7777-000000000001', 2000, '2025-06-01', 'cash');


-- ============================================================
-- SCENARIO 14: UPGRADED MID-PLAN
-- Shahzaib Khan - Started Monthly Class 1 in Jan 2026.
-- Then upgraded to Quarterly Class 2 in Feb 2026.
-- Paid first month of quarterly, 2 unpaid.
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('e0000014-8888-8888-8888-000000000001', 'GYM-MEMBER-000014', 'a1b2c3d4-0001-0001-0001-000000000001', '2026-01-01', '2026-01-31', 2000),
  ('e0000014-8888-8888-8888-000000000002', 'GYM-MEMBER-000014', 'a1b2c3d4-0002-0002-0002-000000000006', '2026-02-01', '2026-04-30', 8000);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000014', 'e0000014-8888-8888-8888-000000000001', '2026-01', 'paid'),
  ('GYM-MEMBER-000014', 'e0000014-8888-8888-8888-000000000002', '2026-02', 'paid'),
  ('GYM-MEMBER-000014', 'e0000014-8888-8888-8888-000000000002', '2026-03', 'unpaid'),
  ('GYM-MEMBER-000014', 'e0000014-8888-8888-8888-000000000002', '2026-04', 'unpaid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000014', 'e0000014-8888-8888-8888-000000000001', 2000, '2026-01-01', 'cash'),
  ('GYM-MEMBER-000014', 'e0000014-8888-8888-8888-000000000002', 2667, '2026-02-01', 'online');


-- ============================================================
-- SCENARIO 15: REFUNDED MONTH
-- Talha Javed - Quarterly Class 1, Oct 1 → Dec 31, 2025
-- All 3 paid, but month 3 (Dec) was refunded.
-- Then renewed Quarterly Jan 1 → Mar 31, 2026 (all paid).
-- ============================================================
INSERT INTO subscriptions (subscription_id, member_id, plan_id, start_date, end_date, price_paid) VALUES
  ('f0000015-9999-9999-9999-000000000001', 'GYM-MEMBER-000015', 'a1b2c3d4-0001-0001-0001-000000000002', '2025-10-01', '2025-12-31', 5500),
  ('f0000015-9999-9999-9999-000000000002', 'GYM-MEMBER-000015', 'a1b2c3d4-0001-0001-0001-000000000002', '2026-01-01', '2026-03-31', 5500);

INSERT INTO membership_months (member_id, subscription_id, month_reference, paid_status) VALUES
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000001', '2025-10', 'paid'),
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000001', '2025-11', 'paid'),
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000001', '2025-12', 'refunded'),
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000002', '2026-01', 'paid'),
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000002', '2026-02', 'paid'),
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000002', '2026-03', 'paid');

INSERT INTO payments (member_id, subscription_id, amount, payment_date, payment_method) VALUES
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000001', 5500, '2025-10-01', 'cash'),
  ('GYM-MEMBER-000015', 'f0000015-9999-9999-9999-000000000002', 5500, '2026-01-01', 'bank_transfer');


-- ============================================================
-- ATTENDANCE DATA (spread across multiple days)
-- Covers last 7 days to show register-style grid
-- ============================================================

-- Today (Mar 15, 2026)
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000001', NOW() - INTERVAL '30 minutes',  CURRENT_DATE, 'barcode', false),
  ('GYM-MEMBER-000002', NOW() - INTERVAL '45 minutes',  CURRENT_DATE, 'manual',  false),
  ('GYM-MEMBER-000003', NOW() - INTERVAL '60 minutes',  CURRENT_DATE, 'barcode', false),
  ('GYM-MEMBER-000004', NOW() - INTERVAL '90 minutes',  CURRENT_DATE, 'manual',  true),
  ('GYM-MEMBER-000006', NOW() - INTERVAL '120 minutes', CURRENT_DATE, 'barcode', false),
  ('GYM-MEMBER-000007', NOW() - INTERVAL '150 minutes', CURRENT_DATE, 'manual',  false),
  ('GYM-MEMBER-000008', NOW() - INTERVAL '20 minutes',  CURRENT_DATE, 'barcode', false),
  ('GYM-MEMBER-000011', NOW() - INTERVAL '180 minutes', CURRENT_DATE, 'manual',  false);

-- Yesterday
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000001', NOW() - INTERVAL '1 day 1 hour',   CURRENT_DATE - 1, 'barcode', false),
  ('GYM-MEMBER-000003', NOW() - INTERVAL '1 day 2 hours',  CURRENT_DATE - 1, 'manual',  false),
  ('GYM-MEMBER-000004', NOW() - INTERVAL '1 day 3 hours',  CURRENT_DATE - 1, 'barcode', true),
  ('GYM-MEMBER-000005', NOW() - INTERVAL '1 day 4 hours',  CURRENT_DATE - 1, 'manual',  true),
  ('GYM-MEMBER-000006', NOW() - INTERVAL '1 day 2 hours',  CURRENT_DATE - 1, 'barcode', false),
  ('GYM-MEMBER-000007', NOW() - INTERVAL '1 day 5 hours',  CURRENT_DATE - 1, 'manual',  false),
  ('GYM-MEMBER-000008', NOW() - INTERVAL '1 day 1 hour',   CURRENT_DATE - 1, 'barcode', false),
  ('GYM-MEMBER-000009', NOW() - INTERVAL '1 day 3 hours',  CURRENT_DATE - 1, 'manual',  false),
  ('GYM-MEMBER-000011', NOW() - INTERVAL '1 day 4 hours',  CURRENT_DATE - 1, 'barcode', false),
  ('GYM-MEMBER-000012', NOW() - INTERVAL '1 day 2 hours',  CURRENT_DATE - 1, 'manual',  true),
  ('GYM-MEMBER-000014', NOW() - INTERVAL '1 day 5 hours',  CURRENT_DATE - 1, 'barcode', false),
  ('GYM-MEMBER-000015', NOW() - INTERVAL '1 day 1 hour',   CURRENT_DATE - 1, 'manual',  false);

-- 2 days ago
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000001', NOW() - INTERVAL '2 days 2 hours', CURRENT_DATE - 2, 'barcode', false),
  ('GYM-MEMBER-000002', NOW() - INTERVAL '2 days 3 hours', CURRENT_DATE - 2, 'manual',  false),
  ('GYM-MEMBER-000003', NOW() - INTERVAL '2 days 1 hour',  CURRENT_DATE - 2, 'barcode', false),
  ('GYM-MEMBER-000006', NOW() - INTERVAL '2 days 4 hours', CURRENT_DATE - 2, 'barcode', false),
  ('GYM-MEMBER-000007', NOW() - INTERVAL '2 days 2 hours', CURRENT_DATE - 2, 'manual',  false),
  ('GYM-MEMBER-000010', NOW() - INTERVAL '2 days 5 hours', CURRENT_DATE - 2, 'barcode', true),
  ('GYM-MEMBER-000011', NOW() - INTERVAL '2 days 3 hours', CURRENT_DATE - 2, 'manual',  false),
  ('GYM-MEMBER-000015', NOW() - INTERVAL '2 days 4 hours', CURRENT_DATE - 2, 'barcode', false);

-- 3 days ago
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000001', NOW() - INTERVAL '3 days 1 hour',  CURRENT_DATE - 3, 'barcode', false),
  ('GYM-MEMBER-000003', NOW() - INTERVAL '3 days 2 hours', CURRENT_DATE - 3, 'manual',  false),
  ('GYM-MEMBER-000004', NOW() - INTERVAL '3 days 3 hours', CURRENT_DATE - 3, 'barcode', true),
  ('GYM-MEMBER-000006', NOW() - INTERVAL '3 days 1 hour',  CURRENT_DATE - 3, 'barcode', false),
  ('GYM-MEMBER-000007', NOW() - INTERVAL '3 days 4 hours', CURRENT_DATE - 3, 'manual',  false),
  ('GYM-MEMBER-000009', NOW() - INTERVAL '3 days 2 hours', CURRENT_DATE - 3, 'barcode', false),
  ('GYM-MEMBER-000011', NOW() - INTERVAL '3 days 5 hours', CURRENT_DATE - 3, 'manual',  false),
  ('GYM-MEMBER-000014', NOW() - INTERVAL '3 days 3 hours', CURRENT_DATE - 3, 'barcode', false),
  ('GYM-MEMBER-000015', NOW() - INTERVAL '3 days 1 hour',  CURRENT_DATE - 3, 'manual',  false);

-- 4 days ago
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000001', NOW() - INTERVAL '4 days 2 hours', CURRENT_DATE - 4, 'barcode', false),
  ('GYM-MEMBER-000002', NOW() - INTERVAL '4 days 3 hours', CURRENT_DATE - 4, 'manual',  false),
  ('GYM-MEMBER-000004', NOW() - INTERVAL '4 days 1 hour',  CURRENT_DATE - 4, 'barcode', true),
  ('GYM-MEMBER-000005', NOW() - INTERVAL '4 days 4 hours', CURRENT_DATE - 4, 'manual',  true),
  ('GYM-MEMBER-000006', NOW() - INTERVAL '4 days 2 hours', CURRENT_DATE - 4, 'barcode', false),
  ('GYM-MEMBER-000007', NOW() - INTERVAL '4 days 5 hours', CURRENT_DATE - 4, 'manual',  false),
  ('GYM-MEMBER-000008', NOW() - INTERVAL '4 days 3 hours', CURRENT_DATE - 4, 'barcode', false),
  ('GYM-MEMBER-000011', NOW() - INTERVAL '4 days 1 hour',  CURRENT_DATE - 4, 'manual',  false),
  ('GYM-MEMBER-000012', NOW() - INTERVAL '4 days 4 hours', CURRENT_DATE - 4, 'barcode', true);

-- 5 days ago
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000001', NOW() - INTERVAL '5 days 1 hour',  CURRENT_DATE - 5, 'barcode', false),
  ('GYM-MEMBER-000003', NOW() - INTERVAL '5 days 3 hours', CURRENT_DATE - 5, 'manual',  false),
  ('GYM-MEMBER-000006', NOW() - INTERVAL '5 days 2 hours', CURRENT_DATE - 5, 'barcode', false),
  ('GYM-MEMBER-000007', NOW() - INTERVAL '5 days 4 hours', CURRENT_DATE - 5, 'manual',  false),
  ('GYM-MEMBER-000010', NOW() - INTERVAL '5 days 1 hour',  CURRENT_DATE - 5, 'barcode', true),
  ('GYM-MEMBER-000011', NOW() - INTERVAL '5 days 5 hours', CURRENT_DATE - 5, 'manual',  false),
  ('GYM-MEMBER-000014', NOW() - INTERVAL '5 days 2 hours', CURRENT_DATE - 5, 'barcode', false),
  ('GYM-MEMBER-000015', NOW() - INTERVAL '5 days 3 hours', CURRENT_DATE - 5, 'manual',  false);

-- 6 days ago
INSERT INTO attendance (member_id, check_in_time, check_in_date, method, attendance_is_overdue) VALUES
  ('GYM-MEMBER-000001', NOW() - INTERVAL '6 days 2 hours', CURRENT_DATE - 6, 'barcode', false),
  ('GYM-MEMBER-000002', NOW() - INTERVAL '6 days 1 hour',  CURRENT_DATE - 6, 'manual',  false),
  ('GYM-MEMBER-000003', NOW() - INTERVAL '6 days 3 hours', CURRENT_DATE - 6, 'barcode', false),
  ('GYM-MEMBER-000004', NOW() - INTERVAL '6 days 4 hours', CURRENT_DATE - 6, 'manual',  true),
  ('GYM-MEMBER-000006', NOW() - INTERVAL '6 days 1 hour',  CURRENT_DATE - 6, 'barcode', false),
  ('GYM-MEMBER-000007', NOW() - INTERVAL '6 days 5 hours', CURRENT_DATE - 6, 'manual',  false),
  ('GYM-MEMBER-000009', NOW() - INTERVAL '6 days 2 hours', CURRENT_DATE - 6, 'barcode', false),
  ('GYM-MEMBER-000011', NOW() - INTERVAL '6 days 3 hours', CURRENT_DATE - 6, 'manual',  false),
  ('GYM-MEMBER-000015', NOW() - INTERVAL '6 days 4 hours', CURRENT_DATE - 6, 'barcode', false);
