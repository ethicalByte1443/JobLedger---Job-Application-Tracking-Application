import { applicationRepository } from '../repositories/application';
import { AppError } from '../middlewares/errorHandler';
import { Prisma } from '@prisma/client';

/**
 * Service layer — contains business logic and calls into the repository.
 */
export const applicationService = {
  getAllApplications: async () => {
    return applicationRepository.findAll();
  },

  getApplicationById: async (id: string) => {
    const application = await applicationRepository.findById(id);
    if (!application) {
      throw new AppError('Application not found', 404);
    }
    return application;
  },

  createApplication: async (data: Prisma.JobApplicationCreateInput) => {
    return applicationRepository.create(data);
  },

  updateApplication: async (id: string, data: Prisma.JobApplicationUpdateInput) => {
    // Verify the application exists before updating
    await applicationService.getApplicationById(id);
    return applicationRepository.update(id, data);
  },

  deleteApplication: async (id: string) => {
    // Verify the application exists before deleting
    await applicationService.getApplicationById(id);
    return applicationRepository.delete(id);
  },
};
