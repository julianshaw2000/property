import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  phoneE164?: string;
  password?: string;
  sendInviteEmail: boolean;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface SetPrimaryAdminRequest {
  userId: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private api = inject(ApiService);

  /**
   * List users in organisation (OrgAdmin+)
   * @param orgId - Optional orgId for SuperAdmin to specify target organisation
   */
  listUsers(skip = 0, take = 50, orgId?: string): Observable<ApiResponse<UserResponse[]>> {
    const params = new URLSearchParams({
      skip: skip.toString(),
      take: take.toString()
    });
    if (orgId) {
      params.append('orgId', orgId);
    }
    return this.api.get<UserResponse[]>(`/admin/users?${params.toString()}`);
  }

  /**
   * Create a new user (OrgAdmin+)
   * @param request - User creation details
   * @param orgId - Optional orgId for SuperAdmin to specify target organisation
   */
  createUser(request: CreateUserRequest, orgId?: string): Observable<ApiResponse<UserResponse>> {
    const url = orgId ? `/admin/users?orgId=${orgId}` : '/admin/users';
    return this.api.post<UserResponse>(url, request);
  }

  /**
   * Update user role (OrgAdmin+)
   * @param userId - User ID to update
   * @param request - New role
   * @param orgId - Optional orgId for SuperAdmin to specify target organisation
   */
  updateUserRole(userId: string, request: UpdateUserRoleRequest, orgId?: string): Observable<ApiResponse<UserResponse>> {
    const url = orgId ? `/admin/users/${userId}/role?orgId=${orgId}` : `/admin/users/${userId}/role`;
    return this.api.patch<UserResponse>(url, request);
  }

  /**
   * Deactivate a user (OrgAdmin+)
   * @param userId - User ID to deactivate
   * @param orgId - Optional orgId for SuperAdmin to specify target organisation
   */
  deactivateUser(userId: string, orgId?: string): Observable<ApiResponse<{ message: string }>> {
    const url = orgId ? `/admin/users/${userId}/deactivate?orgId=${orgId}` : `/admin/users/${userId}/deactivate`;
    return this.api.post<{ message: string }>(url, {});
  }

  /**
   * Set primary admin for organisation (OrgAdmin+)
   * @param orgId - Organisation ID
   * @param request - User ID to set as primary admin
   */
  setPrimaryAdmin(orgId: string, request: SetPrimaryAdminRequest): Observable<ApiResponse<{ message: string }>> {
    return this.api.post<{ message: string }>(`/admin/organisations/${orgId}/primary-admin`, request);
  }
}
