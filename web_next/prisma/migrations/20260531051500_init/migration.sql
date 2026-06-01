-- CreateTable
CREATE TABLE "Command" (
    "id" SERIAL NOT NULL,
    "color" TEXT NOT NULL,
    "mlBlanca" DOUBLE PRECISION NOT NULL,
    "mlRoja" DOUBLE PRECISION NOT NULL,
    "mlVerde" DOUBLE PRECISION NOT NULL,
    "mlAzul" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Command_pkey" PRIMARY KEY ("id")
);
