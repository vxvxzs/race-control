import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TABLE "auth_request_limits" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "count" numeric NOT NULL,
    "expires_at" timestamp(3) with time zone NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  CREATE UNIQUE INDEX "auth_request_limits_key_idx" ON "auth_request_limits" USING btree ("key");
  CREATE INDEX "auth_request_limits_expires_at_idx" ON "auth_request_limits" USING btree ("expires_at");
  CREATE INDEX "auth_request_limits_updated_at_idx" ON "auth_request_limits" USING btree ("updated_at");
  CREATE INDEX "auth_request_limits_created_at_idx" ON "auth_request_limits" USING btree ("created_at");`)
}
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE "auth_request_limits";`)
}
