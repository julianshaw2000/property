import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface PlatformSettings {
  settingsVersion: number;

  maxPropertiesPerOrg: number;
  maxUsersPerOrg: number;
  maxActiveJobsPerMonth: number;
  defaultApprovalThresholdGbp: number;
  maxApprovalThresholdGbp: number;

  billingEnabled: boolean;
  trialDays: number;
  nonpaymentGraceDays: number;
  hardStopOnNonpayment: boolean;
  vatEnabled: boolean;
  vatRatePercent: number;

  channelEmailEnabled: boolean;
  channelSmsEnabled: boolean;
  channelWhatsappEnabled: boolean;

  aiEnabled: boolean;

  platformName: string;
  supportEmail: string;
  termsUrl: string;
  privacyUrl: string;
  globalBannerMessage?: string | null;

  maintenanceMode: boolean;
  readOnlyMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlatformSettingsService {
  private api = inject(ApiService);

  getSettings(): Observable<ApiResponse<PlatformSettings>> {
    return this.api.get<PlatformSettings>('/platform-settings');
  }

  updateSettings(request: PlatformSettings): Observable<ApiResponse<PlatformSettings>> {
    return this.api.patch<PlatformSettings>('/platform-settings', request);
  }

  getPublicSettings(): Observable<ApiResponse<any>> {
    return this.api.get<any>('/platform-settings/public');
  }
}

