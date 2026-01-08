import { Component, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface ApiVersion {
  version: string;
  environment: string;
  timestamp: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h1>🏠 MaintainUK</h1>
      <p>UK Property Maintenance SaaS - Phase 1 Scaffolding</p>

      <div class="status">
        <h2>✅ Phase 1 Complete</h2>
        <ul>
          <li>✅ Documentation (11 files)</li>
          <li>✅ Docker Compose (Postgres, Redis, MinIO)</li>
          <li>✅ Shared package (types, schemas)</li>
          <li>✅ Node jobs service (BullMQ)</li>
          <li>✅ .NET API (minimal endpoints)</li>
          <li>✅ Angular app (standalone components)</li>
        </ul>
      </div>

      @if (apiVersion(); as version) {
        <div class="api-status success">
          <h3>API Connection: ✅</h3>
          <p>Version: {{ version.version }}</p>
          <p>Environment: {{ version.environment }}</p>
        </div>
      } @else if (loading()) {
        <div class="api-status loading">
          <p>Connecting to API...</p>
        </div>
      } @else {
        <div class="api-status error">
          <h3>API Connection: ❌</h3>
          <p>Make sure the API is running on http://localhost:5000</p>
        </div>
      }

      <div class="next-steps">
        <h2>🚀 Next Steps</h2>
        <p><strong>Phase 2:</strong> Database Schema & Migrations</p>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: #1976d2;
    }

    h2 {
      font-size: 1.5rem;
      margin: 2rem 0 1rem;
      color: #333;
    }

    h3 {
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }

    p {
      font-size: 1.1rem;
      color: #666;
      margin-bottom: 1rem;
    }

    .status {
      background: #e8f5e9;
      border-left: 4px solid #4caf50;
      padding: 1.5rem;
      border-radius: 4px;
      margin: 2rem 0;
    }

    .status ul {
      list-style: none;
      margin-top: 1rem;
    }

    .status li {
      padding: 0.5rem 0;
      font-size: 1.1rem;
    }

    .api-status {
      padding: 1.5rem;
      border-radius: 4px;
      margin: 2rem 0;
    }

    .api-status.success {
      background: #e3f2fd;
      border-left: 4px solid #2196f3;
    }

    .api-status.error {
      background: #ffebee;
      border-left: 4px solid #f44336;
    }

    .api-status.loading {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
    }

    .next-steps {
      background: #f5f5f5;
      padding: 1.5rem;
      border-radius: 4px;
      margin-top: 2rem;
    }
  `]
})
export class HomeComponent implements OnInit {
  private readonly http = signal(new HttpClient(null as any)).asReadonly();
  readonly apiVersion = signal<ApiVersion | null>(null);
  readonly loading = signal(true);

  constructor(http: HttpClient) {
    this.http = signal(http).asReadonly();
  }

  ngOnInit() {
    this.checkApiConnection();
  }

  private checkApiConnection() {
    this.http().get<ApiVersion>('http://localhost:5000/api/v1/version')
      .subscribe({
        next: (data) => {
          this.apiVersion.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }
}

