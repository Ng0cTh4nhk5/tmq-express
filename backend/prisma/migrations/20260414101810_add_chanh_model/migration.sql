-- CreateTable
CREATE TABLE "chanh" (
    "id" SERIAL NOT NULL,
    "ten" VARCHAR(200) NOT NULL,
    "dia_chi" VARCHAR(500),
    "dien_thoai" VARCHAR(20),
    "nguoi_lien_he" VARCHAR(200),
    "van_phong_id" INTEGER NOT NULL,
    "ghi_chu" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chanh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chanh_van_phong_id_idx" ON "chanh"("van_phong_id");

-- AddForeignKey
ALTER TABLE "chanh" ADD CONSTRAINT "chanh_van_phong_id_fkey" FOREIGN KEY ("van_phong_id") REFERENCES "van_phong"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
