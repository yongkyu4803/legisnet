/*
  Warnings:

  - You are about to drop the `edges_cosupport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `edges_support` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `metrics_member_total` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `coactor_url` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `committee` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `detail_url` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `bills` table. All the data in the column will be lost.
  - You are about to drop the column `committee_primary` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `party` on the `members` table. All the data in the column will be lost.
  - Added the required column `bill_name` to the `bills` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "edges_cosupport";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "edges_support";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "metrics_member_total";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_bill_cosponsors" (
    "bill_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,

    PRIMARY KEY ("bill_id", "member_id"),
    CONSTRAINT "bill_cosponsors_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("bill_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bill_cosponsors_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members" ("member_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bill_cosponsors" ("bill_id", "member_id") SELECT "bill_id", "member_id" FROM "bill_cosponsors";
DROP TABLE "bill_cosponsors";
ALTER TABLE "new_bill_cosponsors" RENAME TO "bill_cosponsors";
CREATE TABLE "new_bills" (
    "bill_id" TEXT NOT NULL PRIMARY KEY,
    "bill_no" TEXT,
    "bill_name" TEXT NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 22,
    "propose_date" DATETIME,
    "proposer_rep_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bills_proposer_rep_id_fkey" FOREIGN KEY ("proposer_rep_id") REFERENCES "members" ("member_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_bills" ("age", "bill_id", "bill_no", "created_at", "propose_date", "proposer_rep_id", "updated_at") SELECT "age", "bill_id", "bill_no", "created_at", "propose_date", "proposer_rep_id", "updated_at" FROM "bills";
DROP TABLE "bills";
ALTER TABLE "new_bills" RENAME TO "bills";
CREATE TABLE "new_members" (
    "member_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL DEFAULT 22,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_members" ("age", "created_at", "member_id", "name", "updated_at") SELECT "age", "created_at", "member_id", "name", "updated_at" FROM "members";
DROP TABLE "members";
ALTER TABLE "new_members" RENAME TO "members";
CREATE UNIQUE INDEX "members_name_age_key" ON "members"("name", "age");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
