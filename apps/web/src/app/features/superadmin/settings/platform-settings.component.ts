import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-platform-settings',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="settings-container">
      <h1>Platform Settings</h1>
      <mat-card>
        <mat-card-content>
          <p>Platform settings management coming soon...</p>
          <ul>
            <li>Feature flags</li>
            <li>System configuration</li>
            <li>Email templates</li>
            <li>Integration settings</li>
          </ul>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px;
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 1.5rem;
    }

    mat-card {
      margin-top: 24px;
    }

    ul {
      margin-top: 16px;
      line-height: 2;
    }
  `]
})
export class PlatformSettingsComponent {}
