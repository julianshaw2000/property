import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component - now just a simple routing shell.
 * Each area (superadmin, admin, app) has its own layout component.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
  styles: []
})
export class AppComponent {}

