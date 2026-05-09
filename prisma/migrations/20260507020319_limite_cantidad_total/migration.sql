-- AlterTable
ALTER TABLE "LimiteCompra" ADD COLUMN     "cantidadMaxima" INTEGER,
ALTER COLUMN "montoMaximo" DROP NOT NULL;
