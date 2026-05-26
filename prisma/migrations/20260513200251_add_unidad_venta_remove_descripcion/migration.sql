/*
  Warnings:

  - You are about to drop the column `descripcion` on the `Producto` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UnidadVenta" AS ENUM ('Pz', 'Kg');

-- AlterTable
ALTER TABLE "Producto" DROP COLUMN "descripcion",
ADD COLUMN     "unidad" "UnidadVenta" NOT NULL DEFAULT 'Pz';
