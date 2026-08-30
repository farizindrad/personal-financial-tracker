import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const j = (v: unknown) => JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? Number(val) : val));

async function main() {
  const idx = await prisma.$queryRaw<unknown[]>`
    SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND INDEX_NAME IN ('uq_category_name_type','uq_budget_period','idx_account_user','idx_category_user','idx_trx_user','idx_budget_user','idx_goal_user','idx_recurring_user','users_email_key')
    ORDER BY TABLE_NAME, INDEX_NAME`;
  console.log('INDEXES', j(idx));

  const cols = await prisma.$queryRaw<unknown[]>`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'user_id'
    ORDER BY TABLE_NAME`;
  console.log('USER_ID COLS', j(cols));

  const fks = await prisma.$queryRaw<unknown[]>`
    SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME`;
  console.log('FKS', j(fks));

  const views = await prisma.$queryRaw<unknown[]>`
    SELECT TABLE_NAME FROM information_schema.VIEWS WHERE TABLE_SCHEMA = DATABASE()`;
  console.log('VIEWS', j(views));

  const users = await prisma.$queryRaw<unknown[]>`SELECT id, email FROM users`;
  console.log('USERS', j(users));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
