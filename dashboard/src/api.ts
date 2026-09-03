const API_BASE = 'http://localhost:3000/api';

export interface ApplicationFromAPI {
  id: string;
  companyName: string;
  jobRole: string;
  applicationLink: string;
  applicantEmail: string;
  portalName: string;
  status: string;
  appliedDate: string;
  appliedTime: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchApplications(): Promise<ApplicationFromAPI[]> {
  const res = await fetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error('Failed to fetch applications');
  const json = await res.json();
  return json.data ?? json;
}

export async function updateApplication(
  id: string,
  data: Partial<ApplicationFromAPI>
): Promise<ApplicationFromAPI> {
  const res = await fetch(`${API_BASE}/application/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update application');
  const json = await res.json();
  return json.data ?? json;
}

export async function deleteApplication(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/application/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete application');
}

export function getCSVExportUrl(): string {
  return `${API_BASE}/exports/csv`;
}
