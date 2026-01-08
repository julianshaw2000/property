import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface AuditLogResponse {
  id: string;
  orgId: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  changesSummaryJson: string | null;
  ipAddress: string | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private api = inject(ApiService);

  /**
   * List audit logs (OrgAdmin+)
   * SuperAdmin sees all orgs, OrgAdmin sees only their org
   */
  listAuditLogs(skip = 0, take = 100): Observable<ApiResponse<AuditLogResponse[]>> {
    return this.api.get<AuditLogResponse[]>(`/admin/audit-logs?skip=${skip}&take=${take}`);
  }
}
