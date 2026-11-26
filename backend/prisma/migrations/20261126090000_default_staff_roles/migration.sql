-- Backfill editable starter roles for existing businesses without changing any
-- existing role, membership or invitation (including differently cased names).
INSERT INTO "BusinessRole" ("id", "businessId", "name", "description", "permissions", "isSystem")
SELECT gen_random_uuid(), b."id", r.name, r.description, r.permissions::jsonb, false
FROM "Business" b
CROSS JOIN (VALUES
  ('Manager', 'Manage branch sales, transactions and inventory', '["View dashboard","Manage sales","View transactions","Manage products & inventory"]'),
  ('Cashier', 'Record sales and view transactions in the assigned branch', '["View dashboard","Manage sales","View transactions"]'),
  ('Inventory Officer', 'Manage products and inventory in the assigned branch', '["View dashboard","Manage products & inventory"]')
) AS r(name, description, permissions)
WHERE NOT EXISTS (
  SELECT 1 FROM "BusinessRole" existing
  WHERE existing."businessId" = b."id" AND lower(existing."name") = lower(r.name)
)
ON CONFLICT ("businessId", "name") DO NOTHING;
