/**
 * Coordinator Dashboard Types
 */

// Statistics interfaces
export interface CallStats {
  total: number;
  draft: number;
  published: number;
  closed: number;
  under_review: number;
  results_published: number;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  submitted: number;
  under_review: number;
  approved: number;
  rejected: number;
}

export interface SubmissionStats {
  total: number;
  pending: number;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface DashboardStats {
  calls: CallStats;
  applications: ApplicationStats;
  submissions: SubmissionStats;
}

// Pending review item
export interface PendingReviewItem {
  type: 'application' | 'submission';
  id: number;
  call_id?: number;
  company_id?: number;
  application_id?: number;
  employee_id?: number;
  submitted_at?: string;
  status: string;
}

// Recent activity item
export interface RecentActivityItem {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: number;
  entity_name?: string;
  user_name?: string;
  old_status?: string;
  new_status?: string;
  notes?: string;
  created_at: string;
  user_id?: number;
}

// Analytics data
export interface AnalyticsData {
  period_days: number;
  applications_by_status: Record<string, number>;
  applications_over_time: Array<{
    date: string;
    count: number;
  }>;
  calls_by_department: Record<string, number>;
  approval_rate: number;
  total_calls: number;
  total_applications: number;
}

// Coordinator call summary
export interface CoordinatorCall {
  id: number;
  title: string;
  reference_number: string;
  department: string;
  status: string;
  application_deadline?: string;
  application_count: number;
  created_at?: string;
}

// Response interfaces
export interface DashboardResponse {
  stats: DashboardStats;
  last_updated: string;
}

export interface PendingReviewsResponse {
  items: PendingReviewItem[];
  total: number;
}

export interface RecentActivityResponse {
  activities: RecentActivityItem[];
  total: number;
}

export interface AnalyticsResponse {
  data: AnalyticsData;
  generated_at: string;
}

export interface CoordinatorCallsResponse {
  calls: CoordinatorCall[];
  total: number;
}

// Action display helpers — covers both dot-notation (backend) and plain keys
export const ACTION_LABELS: Record<string, string> = {
  // Call actions (dot-notation from backend)
  'call.create': 'Appel créé',
  'call.update': 'Appel modifié',
  'call.delete': 'Appel supprimé',
  'call.publish': 'Appel publié',
  'call.close': 'Appel fermé',
  'call.start_review': 'Examen démarré',
  'call.publish_results': 'Résultats publiés',
  'call.reopen': 'Appel réouvert',
  // Application actions
  'application.submit': 'Candidature soumise',
  'application.approve': 'Candidature approuvée',
  'application.reject': 'Candidature rejetée',
  'application.request_info': 'Informations complémentaires demandées',
  'application.withdraw': 'Candidature retirée',
  'application.create': 'Candidature créée',
  // Submission actions
  'submission.submit': 'Soumission envoyée',
  'submission.approve': 'Soumission approuvée',
  'submission.reject': 'Soumission rejetée',
  'submission.request_info': 'Informations demandées',
  'submission.create': 'Soumission créée',
  // Document actions
  'document.upload': 'Document uploadé',
  'document.approve': 'Document approuvé',
  'document.reject': 'Document rejeté',
  // Plain fallbacks
  'create': 'Création',
  'update': 'Modification',
  'delete': 'Suppression',
  'publish': 'Publication',
  'close': 'Fermeture',
  'start_review': "Début d'examen",
  'publish_results': 'Publication des résultats',
  'reopen': 'Réouverture',
  'submit': 'Soumission',
  'approve': 'Approbation',
  'reject': 'Rejet',
  'request_info': "Demande d'informations",
  'withdraw': 'Retrait',
};

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  // PascalCase class names (from backend)
  'CallForApplicants': 'Appel à candidatures',
  'CompanyApplication': 'Candidature entreprise',
  'EmployeeSubmission': 'Soumission employé',
  // Lowercase fallbacks
  'call': 'Appel à candidatures',
  'application': 'Candidature entreprise',
  'submission': 'Soumission employé',
  'document': 'Document',
};

/**
 * Returns a human-readable label for an audit log action.
 * Handles dot-notation ("call.publish") and plain keys ("publish").
 */
export function formatActivityLabel(action: string, entityType?: string): string {
  // Try full dot-notation key first
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];

  // Try to build a label from prefix + verb
  if (action.includes('.')) {
    const [prefix, verb] = action.split('.');
    const entityLabel = ENTITY_TYPE_LABELS[entityType || prefix] || prefix;
    const verbLabels: Record<string, string> = {
      create: 'créé(e)',
      update: 'modifié(e)',
      delete: 'supprimé(e)',
      publish: 'publié(e)',
      close: 'fermé(e)',
      start_review: 'en examen',
      publish_results: '— résultats publiés',
      reopen: 'réouvert(e)',
      submit: 'soumis(e)',
      approve: 'approuvé(e)',
      reject: 'rejeté(e)',
      request_info: "— informations demandées",
      withdraw: 'retiré(e)',
    };
    return `${entityLabel} ${verbLabels[verb] || verb}`;
  }

  return action;
}
