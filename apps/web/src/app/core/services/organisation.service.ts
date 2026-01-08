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
}

@Injectable({
  providedIn: 'root'
})
export class OrganisationService {
  private api = inject(ApiService);

  /**
   * List all organisations (SuperAdmin only)
   */
  listOrganisations(skip = 0, take = 50): Observable<ApiResponse<OrganisationResponse[]>> {
    return this.api.get<OrganisationResponse[]>(`/admin/organisations?skip=${skip}&take=${take}`);
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
