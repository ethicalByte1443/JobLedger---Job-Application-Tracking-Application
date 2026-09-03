import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Validation middleware for creating a job application.
 * Ensures required fields are present and non-empty.
 */
export const validateCreateApplication = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { companyName, jobRole, applicationLink, applicantEmail, portalName, appliedDate, appliedTime } = req.body;

  const missing: string[] = [];
  if (!companyName || typeof companyName !== 'string') missing.push('companyName');
  if (!jobRole || typeof jobRole !== 'string') missing.push('jobRole');
  if (!applicationLink || typeof applicationLink !== 'string') missing.push('applicationLink');
  if (!applicantEmail || typeof applicantEmail !== 'string') missing.push('applicantEmail');
  if (!portalName || typeof portalName !== 'string') missing.push('portalName');
  if (!appliedDate || typeof appliedDate !== 'string') missing.push('appliedDate');
  if (!appliedTime || typeof appliedTime !== 'string') missing.push('appliedTime');

  if (missing.length > 0) {
    return next(new AppError(`Missing required fields: ${missing.join(', ')}`, 400));
  }

  next();
};

/**
 * Validation middleware for updating a job application.
 * Ensures at least one valid field is present and all provided fields are strings.
 */
export const validateUpdateApplication = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const allowedFields = ['companyName', 'jobRole', 'applicationLink', 'applicantEmail', 'portalName', 'status', 'appliedDate', 'appliedTime'];
  const bodyKeys = Object.keys(req.body);

  if (bodyKeys.length === 0) {
    return next(new AppError('Request body cannot be empty for update', 400));
  }

  for (const key of bodyKeys) {
    if (!allowedFields.includes(key)) {
      return next(new AppError(`Unknown field: ${key}`, 400));
    }
    if (typeof req.body[key] !== 'string') {
      return next(new AppError(`Field '${key}' must be a string`, 400));
    }
  }

  next();
};
