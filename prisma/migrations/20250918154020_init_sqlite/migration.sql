-- CreateTable
CREATE TABLE "members" (
    "member_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "party" TEXT,
    "committee_primary" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "bills" (
    "bill_id" TEXT NOT NULL PRIMARY KEY,
    "bill_no" TEXT,
    "name" TEXT NOT NULL,
    "committee" TEXT,
    "age" INTEGER NOT NULL,
    "propose_date" DATETIME,
    "result" TEXT,
    "detail_url" TEXT,
    "coactor_url" TEXT,
    "proposer_rep_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bills_proposer_rep_id_fkey" FOREIGN KEY ("proposer_rep_id") REFERENCES "members" ("member_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bill_cosponsors" (
    "bill_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,

    PRIMARY KEY ("bill_id", "member_id"),
    CONSTRAINT "bill_cosponsors_bill_id_fkey" FOREIGN KEY ("bill_id") REFERENCES "bills" ("bill_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "bill_cosponsors_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members" ("member_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "edges_support" (
    "src_member_id" TEXT NOT NULL,
    "dst_member_id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "first_date" DATETIME,
    "last_date" DATETIME,
    "normalized_weight" REAL,
    "time_decay_weight" REAL,

    PRIMARY KEY ("src_member_id", "dst_member_id", "age"),
    CONSTRAINT "edges_support_src_member_id_fkey" FOREIGN KEY ("src_member_id") REFERENCES "members" ("member_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "edges_support_dst_member_id_fkey" FOREIGN KEY ("dst_member_id") REFERENCES "members" ("member_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "edges_cosupport" (
    "member_id_a" TEXT NOT NULL,
    "member_id_b" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("member_id_a", "member_id_b", "age"),
    CONSTRAINT "edges_cosupport_member_id_a_fkey" FOREIGN KEY ("member_id_a") REFERENCES "members" ("member_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "edges_cosupport_member_id_b_fkey" FOREIGN KEY ("member_id_b") REFERENCES "members" ("member_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "metrics_member_total" (
    "member_id" TEXT NOT NULL PRIMARY KEY,
    "age" INTEGER NOT NULL,
    "in_degree_w" INTEGER NOT NULL DEFAULT 0,
    "out_degree_w" INTEGER NOT NULL DEFAULT 0,
    "betweenness" REAL,
    "clustering" REAL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "metrics_member_total_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members" ("member_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "members_name_age_key" ON "members"("name", "age");
