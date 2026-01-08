import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { getHomeRouteForRole } from '../utils/role-routes';

/**
 * Component that redirects users to their role-appropriate home route.
 * Used at root path to handle default navigation.
 */
@Component({
  selector: 'app-role-redirect',
  standalone: true,
  template: `
    <div class="redirect-container">
      <div class="redirect-message">Redirecting...</div>
    </div>
  `,
  styles: [`
    .redirect-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .redirect-message {
      font-size: 1.5rem;
      color: white;
      font-weight: 500;
    }
  `]
})
export class RoleRedirectComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    const role = this.auth.role();
    const homeRoute = getHomeRouteForRole(role);
    this.router.navigate([homeRoute]);
  }
}
