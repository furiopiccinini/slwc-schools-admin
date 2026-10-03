-- AlterTable
ALTER TABLE "wp_schools" ADD COLUMN "default_monthly_fee" DECIMAL(10,2) NOT NULL DEFAULT 50.00;
ALTER TABLE "wp_schools" ADD COLUMN "payments_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "wp_monthly_payment_entries" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "expected_amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_monthly_payment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wp_monthly_payment_entries_school_id_year_month_idx" ON "wp_monthly_payment_entries"("school_id", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "wp_monthly_payment_entries_subscriber_id_year_month_key" ON "wp_monthly_payment_entries"("subscriber_id", "year", "month");

-- AddForeignKey
ALTER TABLE "wp_monthly_payment_entries" ADD CONSTRAINT "wp_monthly_payment_entries_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "wp_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wp_monthly_payment_entries" ADD CONSTRAINT "wp_monthly_payment_entries_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "wp_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
