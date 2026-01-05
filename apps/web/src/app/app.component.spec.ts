import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      isAuthenticated: signal(false),
      userId: signal(null),
      orgId: signal(null)
    });

    await TestBed.configureTestingModule({
      imports: [AppComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have authService injected', () => {
    expect(component.authService).toBeTruthy();
  });

  describe('when not authenticated', () => {
    it('should not show sidenav', () => {
      const sidenav = fixture.nativeElement.querySelector('mat-sidenav-container');
      expect(sidenav).toBeFalsy();
    });

    it('should show router outlet for auth pages', () => {
      const outlet = fixture.nativeElement.querySelector('router-outlet');
      expect(outlet).toBeTruthy();
    });
  });

  describe('when authenticated', () => {
    let authenticatedFixture: ComponentFixture<AppComponent>;
    let authenticatedComponent: AppComponent;

    beforeEach(async () => {
      // Create a new spy with authenticated state
      const authServiceAuthenticatedSpy = jasmine.createSpyObj('AuthService', ['logout'], {
        isAuthenticated: signal(true),
        userId: signal('user-123'),
        orgId: signal('org-456')
      });

      await TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [AppComponent, NoopAnimationsModule],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: authServiceAuthenticatedSpy }
        ]
      }).compileComponents();

      authenticatedFixture = TestBed.createComponent(AppComponent);
      authenticatedComponent = authenticatedFixture.componentInstance;
      authenticatedFixture.detectChanges();
    });

    it('should show sidenav container', () => {
      const sidenav = authenticatedFixture.nativeElement.querySelector('mat-sidenav-container');
      expect(sidenav).toBeTruthy();
    });

    it('should show navigation links', () => {
      const navLinks = authenticatedFixture.nativeElement.querySelectorAll('mat-nav-list a');
      expect(navLinks.length).toBeGreaterThan(0);
    });

    it('should have dashboard link', () => {
      const dashboardLink = authenticatedFixture.nativeElement.querySelector('a[routerLink="/dashboard"]');
      expect(dashboardLink).toBeTruthy();
    });

    it('should have tickets link', () => {
      const ticketsLink = authenticatedFixture.nativeElement.querySelector('a[routerLink="/tickets"]');
      expect(ticketsLink).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('should call authService.logout when logout is triggered', () => {
      component.logout();
      expect(authServiceSpy.logout).toHaveBeenCalled();
    });
  });
});
