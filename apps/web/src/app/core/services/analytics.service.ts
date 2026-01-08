import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface OrganisationUsage {
  organisationId: string;
  organisationName: string;
  plan: string;
  status: string;
  ticketCount: number;
  workOrderCount: number;
  userCount: number;
  maxUsers: number;
  maxTickets: number;
  storageUsedGb: number;
  maxStorageGb: number;
  apiCallCount: number;
  maxApiCalls: number;
  createdAt: string;
  lastActivityAt: string | null;
  exceedsLimits: boolean;
}

export interface UsageStatsResponse {
  organisations: OrganisationUsage[];
}

export interface TopOrganisation {
  organisationId: string;
  organisationName: string;
  plan: string;
  metricName: string;
  metricValue: number;
}

export interface TopOrganisationsResponse {
  metric: string;
  organisations: TopOrganisation[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private api = inject(ApiService);

  /**
   * Get usage statistics for all organisations
   */
  getUsageStats(): Observable<ApiResponse<UsageStatsResponse>> {
    return this.api.get<UsageStatsResponse>('/admin/analytics/usage');
  }

  /**
   * Get top organisations by metric
   */
  getTopOrganisations(metric: string = 'tickets', limit: number = 10): Observable<ApiResponse<TopOrganisationsResponse>> {
    return this.api.get<TopOrganisationsResponse>(`/admin/analytics/top-organisations?metric=${metric}&limit=${limit}`);
  }

  /**
   * Get organisations exceeding their plan limits
   */
  getOrganisationsExceedingLimits(): Observable<ApiResponse<UsageStatsResponse>> {
    return this.api.get<UsageStatsResponse>('/admin/analytics/exceeding-limits');
  }
}
