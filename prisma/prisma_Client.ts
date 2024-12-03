import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()
console.log('Prisma client for the database initiated');

export default prisma