export enum JobStatus {
  APPLIED = 'Applied',
  UNDER_REVIEW = 'Under Review',
  OA_RECEIVED = 'OA Received',
  INTERVIEW_SCHEDULED = 'Interview Scheduled',
  OFFER_RECEIVED = 'Offer Received',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  GHOSTED = 'Ghosted'
}

export interface JobApplication {
  id: string;
  companyName: string;
  jobRole: string;
  applicationLink: string;
  applicantEmail: string;
  portalName: string;
  status: JobStatus;
  appliedDate: string;
  appliedTime: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateJobApplicationDTO = Omit<JobApplication, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateJobApplicationDTO = Partial<CreateJobApplicationDTO>;
