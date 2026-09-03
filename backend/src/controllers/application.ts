import { Request, Response, NextFunction } from 'express';
import { applicationService } from '../services/application';

/**
 * Controller layer — handles HTTP request/response and delegates
 * business logic to the service layer.
 */
export const applicationController = {
  // GET /api/applications
  getApplications: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const applications = await applicationService.getAllApplications();
      res.json({ success: true, data: applications });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/application/:id
  getApplicationById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await applicationService.getApplicationById(req.params.id);
      res.json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  },

  // POST /api/application
  createApplication: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await applicationService.createApplication(req.body);
      res.status(201).json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  },

  // PUT /api/application/:id
  updateApplication: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await applicationService.updateApplication(req.params.id, req.body);
      res.json({ success: true, data: application });
    } catch (error) {
      next(error);
    }
  },

  // DELETE /api/application/:id
  deleteApplication: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await applicationService.deleteApplication(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
