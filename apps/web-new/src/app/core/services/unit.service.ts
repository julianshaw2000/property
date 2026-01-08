import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface Unit {
  id: string;
  propertyId: string;
  propertyAddress: string;
  unitNumber: string;
  name: string;
  bedrooms: number | null;
  bathrooms: number | null;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class UnitService {
  private api = inject(ApiService);

  listUnits(): Observable<ApiResponse<Unit[]>> {
    return this.api.get<Unit[]>('/units');
  }

  seedTestData(): Observable<ApiResponse<any>> {
    return this.api.post<any>('/dev/seed', {});
  }
}
