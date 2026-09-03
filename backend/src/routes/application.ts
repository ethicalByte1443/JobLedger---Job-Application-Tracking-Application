import { Router, Request, Response, NextFunction } from 'express';
import { applicationController } from '../controllers/application';
import { validateCreateApplication, validateUpdateApplication } from '../middlewares/validation';
import { applicationRepository } from '../repositories/application';
import Papa from 'papaparse';

const router = Router();

// --- Application CRUD Routes ---
router.get('/applications', applicationController.getApplications);
router.get('/application/:id', applicationController.getApplicationById);
router.post('/application', validateCreateApplication, applicationController.createApplication);
router.put('/application/:id', validateUpdateApplication, applicationController.updateApplication);
router.delete('/application/:id', applicationController.deleteApplication);

// --- CSV Export Route ---
router.get('/exports/csv', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const applications = await applicationRepository.findAll();

    const csvData = applications.map((app) => ({
      'Company Name': app.companyName,
      'Job Role': app.jobRole,
      'Link': app.applicationLink,
      'Email': app.applicantEmail,
      'Status': app.status,
      'Date': app.appliedDate,
      'Time': app.appliedTime,
      'Portal': app.portalName,
    }));

    const csv = Papa.unparse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=job_applications.csv');
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

export default router;
