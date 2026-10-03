-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'INSTRUCTOR');

-- CreateTable
CREATE TABLE "public"."wp_schools" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "gym_name" TEXT,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wp_instructors" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'INSTRUCTOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wp_subscribers" (
    "id" SERIAL NOT NULL,
    "school_id" INTEGER NOT NULL,
    "qr_code" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "birth_place" TEXT NOT NULL,
    "birth_cap" TEXT NOT NULL,
    "fiscal_code" TEXT NOT NULL,
    "residence" TEXT NOT NULL,
    "residence_city" TEXT NOT NULL,
    "residence_cap" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "duan" INTEGER NOT NULL,
    "document_type" TEXT,
    "document_number" TEXT,
    "document_expiry" TIMESTAMP(3) NOT NULL,
    "has_medical_cert" BOOLEAN NOT NULL DEFAULT false,
    "medical_cert_s3_key" TEXT,
    "slwc_join_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annual_payment" BOOLEAN NOT NULL DEFAULT false,
    "is_eps_member" BOOLEAN NOT NULL DEFAULT false,
    "eps_card_number" TEXT,
    "eps_join_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_subscribers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wp_medical_certificates" (
    "id" SERIAL NOT NULL,
    "subscriber_id" INTEGER NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_medical_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wp_schools_slug_key" ON "public"."wp_schools"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "wp_instructors_email_key" ON "public"."wp_instructors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "wp_subscribers_qr_code_key" ON "public"."wp_subscribers"("qr_code");

-- AddForeignKey
ALTER TABLE "public"."wp_instructors" ADD CONSTRAINT "wp_instructors_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."wp_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wp_subscribers" ADD CONSTRAINT "wp_subscribers_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."wp_schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wp_medical_certificates" ADD CONSTRAINT "wp_medical_certificates_subscriber_id_fkey" FOREIGN KEY ("subscriber_id") REFERENCES "public"."wp_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
