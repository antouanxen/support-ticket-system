-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'Urgent');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "c_name" VARCHAR(255),
    "c_email" VARCHAR(50) NOT NULL,
    "issue_description" TEXT,
    "priority" "PriorityLevel" NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ticket_Id" UUID NOT NULL,
    "content" TEXT,
    "user_Id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(255) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_c_email_key" ON "Ticket"("c_email");

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_ticket_Id_fkey" FOREIGN KEY ("ticket_Id") REFERENCES "Ticket"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Comments" ADD CONSTRAINT "Comments_user_Id_fkey" FOREIGN KEY ("user_Id") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
