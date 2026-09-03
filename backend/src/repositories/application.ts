import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Repository layer — responsible for all direct database interactions
 * via Prisma. Controllers/services call into this layer.
 */
export const applicationRepository = {
  findAll: () => {
    return prisma.jobApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },

  findById: (id: string) => {
    return prisma.jobApplication.findUnique({ where: { id } });
  },

  create: (data: Prisma.JobApplicationCreateInput) => {
    return prisma.jobApplication.create({ data });
  },

  update: (id: string, data: Prisma.JobApplicationUpdateInput) => {
    return prisma.jobApplication.update({ where: { id }, data });
  },

  delete: (id: string) => {
    return prisma.jobApplication.delete({ where: { id } });
  },
};
