-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_work_tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "report_id" INTEGER NOT NULL,
    "task_no" TEXT NOT NULL,
    "category" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "task_issue" TEXT,
    "extracted_lots" TEXT,
    "extracted_quantities" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "work_tasks_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "daily_reports" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_work_tasks" ("category", "content", "created_at", "deleted_at", "extracted_lots", "extracted_quantities", "id", "report_id", "status", "task_no", "updated_at") SELECT "category", "content", "created_at", "deleted_at", "extracted_lots", "extracted_quantities", "id", "report_id", "status", "task_no", "updated_at" FROM "work_tasks";
DROP TABLE "work_tasks";
ALTER TABLE "new_work_tasks" RENAME TO "work_tasks";
CREATE INDEX "work_tasks_report_id_idx" ON "work_tasks"("report_id");
CREATE INDEX "work_tasks_status_idx" ON "work_tasks"("status");
CREATE INDEX "work_tasks_extracted_lots_idx" ON "work_tasks"("extracted_lots");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
