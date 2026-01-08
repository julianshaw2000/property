import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface OrganisationResponse {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  primaryAdminUserId: string | null;
  createdAt: string;
  userCount: number;
}

export interface OrganisationDetailResponse {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  primaryAdminUserId: string | null;
  primaryAdminName: string | null;
  userCount: number;
  createdAt: string;
  users: UserSummary[];
}

export interface UserSummary {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
}

export interface CreateOrganisationRequest {
  name: string;
  plan: string;
  adminEmail?: string;
  adminFirstName?: string;
  adminLastName?: string;
  sendInviteEmail?: boolean;
  adminPassword?: string | null;
}

export interface OrganisationFilters {
  search?: string;
  plans?: string[];
  statuses?: string[];
  createdFrom?: string;
  createdTo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganisationService {
  private api = inject(ApiService);

  /**
   * List all organisations (SuperAdmin only)
   */
  listOrganisations(filters: OrganisationFilters = {}, skip = 0, take = 50): Observable<ApiResponse<OrganisationResponse[]>> {
    const params = new URLSearchParams();
    params.set('skip', String(skip));
    params.set('take', String(take));

    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.plans && filters.plans.length > 0) {
      params.set('plan', filters.plans.join(','));
    }
    if (filters.statuses && filters.statuses.length > 0) {
      params.set('status', filters.statuses.join(','));
    }
    if (filters.createdFrom) {
      params.set('createdFrom', filters.createdFrom);
    }
    if (filters.createdTo) {
      params.set('createdTo', filters.createdTo);
    }

    const query = params.toString();
    const path = query ? `/admin/organisations?${query}` : '/admin/organisations';
    return this.api.get<OrganisationResponse[]>(path);
  }

  /**
   * Get organisation details by ID (SuperAdmin only)
   */
  getOrganisation(id: string): Observable<ApiResponse<OrganisationDetailResponse>> {
    return this.api.get<OrganisationDetailResponse>(`/admin/organisations/${id}`);
  }

  /**
   * Create a new organisation (SuperAdmin only)
   */
  createOrganisation(request: CreateOrganisationRequest): Observable<ApiResponse<OrganisationResponse>> {
    return this.api.post<OrganisationResponse>('/admin/organisations', request);
  }

  /**
   * Suspend an organisation (SuperAdmin only)
   */
  suspendOrganisation(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.api.post<{ message: string }>(`/admin/organisations/${id}/suspend`, {});
  }

  /**
   * Reactivate a suspended organisation (SuperAdmin only)
   */
  reactivateOrganisation(id: string): Observable<ApiResponse<{ message: string }>> {
    return this.api.post<{ message: string }>(`/admin/organisations/${id}/reactivate`, {});
  }
}
