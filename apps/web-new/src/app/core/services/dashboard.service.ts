import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface DashboardStats {
  totalOrganisations: number;
  activeOrganisations: number;
  suspendedOrganisations: number;
  totalUsers: number;
  activeUsers: number;
  organisationGrowthPercent: number;
  userGrowthPercent: number;
  usersByRole: Record<string, number>;
  organisationsByPlan: Record<string, number>;
}

export interface GrowthDataPoint {
  date: string;
  organisationSignups: number;
  userRegistrations: number;
}

export interface GrowthData {
  dataPoints: GrowthDataPoint[];
}

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  entityId: string;
  metadata: Record<string, string>;
}

export interface ActivityFeed {
  activities: ActivityItem[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private api = inject(ApiService);

  /**
   * Get platform-wide statistics
   */
  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.api.get<DashboardStats>('/admin/dashboard/stats');
  }

  /**
   * Get growth data for charts
   */
  getGrowthData(days: number = 30): Observable<ApiResponse<GrowthData>> {
    return this.api.get<GrowthData>(`/admin/dashboard/growth?days=${days}`);
  }

  /**
   * Get recent activity feed
   */
  getActivityFeed(limit: number = 20): Observable<ApiResponse<ActivityFeed>> {
    return this.api.get<ActivityFeed>(`/admin/dashboard/activity?limit=${limit}`);
  }
}
