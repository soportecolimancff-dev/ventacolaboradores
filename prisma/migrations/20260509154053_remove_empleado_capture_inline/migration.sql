/*
  Warnings:

  - You are about to drop the column `empleadoId` on the `Pedido` table. All the data in the column will be lost.
  - You are about to drop the `Empleado` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[noEmpleado,sucursalId,semana]` on the table `Pedido` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `noEmpleado` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nombreEmpleado` to the `Pedido` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Empleado" DROP CONSTRAINT "Empleado_sucursalId_fkey";

-- DropForeignKey
ALTER TABLE "Pedido" DROP CONSTRAINT "Pedido_empleadoId_fkey";

-- DropIndex
DROP INDEX "Pedido_empleadoId_sucursalId_semana_key";

-- AlterTable
ALTER TABLE "Pedido" DROP COLUMN "empleadoId",
ADD COLUMN     "emailEmpleado" TEXT,
ADD COLUMN     "noEmpleado" TEXT NOT NULL,
ADD COLUMN     "nombreEmpleado" TEXT NOT NULL;

-- DropTable
DROP TABLE "Empleado";

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_noEmpleado_sucursalId_semana_key" ON "Pedido"("noEmpleado", "sucursalId", "semana");
