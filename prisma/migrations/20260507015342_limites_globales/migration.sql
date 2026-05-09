/*
  Warnings:

  - You are about to drop the column `sucursalId` on the `LimiteCompra` table. All the data in the column will be lost.
  - You are about to drop the column `maxPorPedido` on the `ProductoSucursal` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[semana]` on the table `LimiteCompra` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LimiteCompra" DROP CONSTRAINT "LimiteCompra_sucursalId_fkey";

-- DropIndex
DROP INDEX "LimiteCompra_sucursalId_semana_key";

-- AlterTable
ALTER TABLE "LimiteCompra" DROP COLUMN "sucursalId";

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "maxCantidad" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "ProductoSucursal" DROP COLUMN "maxPorPedido";

-- CreateIndex
CREATE UNIQUE INDEX "LimiteCompra_semana_key" ON "LimiteCompra"("semana");
