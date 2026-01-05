Purpose:
Reusable architecture, design, and delivery guide for Angular + .NET applications. Intended to be copied and lightly customised per product or client.

🔩 Core Architectural Stack
Frontend

Angular (latest supported version)

Standalone components only

Feature-first folder structure

Angular Signals for UI and feature state

Reactive Forms only

SCSS with Flexbox and CSS Grid

Angular Material via a single shared module

OnPush change detection by default

Backend

.NET (C#) using Minimal APIs

Layered structure:

Contracts – DTOs, requests, responses

Domain – entities, value objects, business rules

Application – use cases, orchestration services

Infrastructure – EF Core, persistence, integrations

PostgreSQL (or equivalent relational database)

JWT authentication with roles and permissions

Validation via FluentValidation or attributes

Consistent API response envelope:

{ "data": ..., "error": null, "traceId": "..." }

Cross-cutting Concerns

Dependency injection everywhere

Central logging and audit trail

Environment-specific configuration

OWASP Top 10 security controls applied by default

🎨 UX, UI, and Styling Principles
Design System

Central design tokens:

Colours

Spacing

Typography

Elevation

Radius

Shared layout primitives:

App shell

Toolbar

Sidebar

Content container

Reusable components:

Buttons

Inputs

Tables

Cards

Modals

Alerts

Standard loading, empty, and error states

Layout & Responsiveness

Flexbox and CSS Grid only

Mobile-first approach

Responsive breakpoints:

Phone

Tablet

Desktop

No !important

Accessibility

Target WCAG AA or better

Keyboard-first navigation

ARIA roles where required

Visible focus states

Sufficient colour contrast

Interaction Patterns

Confirm destructive actions

Prefer soft delete or undo

Progressive forms (steps, tabs, sections)

Optimistic UI only when rollback is simple

🧱 Frontend Architecture & Patterns (Angular + Signals)
1. Feature-First Structure

Each feature contains:

components/ – presentational components

pages/ – route-level containers

services/ – feature services and stores

models/ – typed models and DTOs

forms/ – form builders and validators

2. Component Responsibilities

Container components

Own signals and reactive forms

Coordinate routing and data loading

Call feature stores and services

No low-level UI logic

Presentational components

Input / Output driven

No business logic

Signals only for local UI state

3. Signals Store Pattern

One store per feature

Single source of truth for:

Entities

Selection

Loading

Errors

Filters

@Injectable({ providedIn: 'root' })
export class FeatureStore {
  private readonly _items = signal<Item[]>([]);
  private readonly _selectedId = signal<string | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly selectedId = this._selectedId.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly selectedItem = computed(() =>
    this._items().find(i => i.id === this._selectedId()) ?? null
  );
}


Rules

signal for writable state

computed for derived state

effect only for explicit side-effects

Keep graphs shallow and readable

4. HTTP & State Separation

API services:

Wrap HttpClient

Handle DTO ↔ model mapping

Stores:

Hold signals

Call API services

Components:

Consume read-only signals only

No any types

5. Forms + Signals

Reactive Forms for:

Validation

Submission

Complex structures

Signals for:

Mode (view | edit | create)

Async flags

UI rules

readonly mode = signal<'view' | 'edit' | 'create'>('view');
readonly saving = signal(false);

🧠 Backend Architecture & Patterns (.NET)
1. Layer Responsibilities

Contracts

DTOs only

Versioned when public

Basic validation attributes

Domain

Business rules enforced here

Value objects for core concepts

Optional domain events

Application

Stateless services

Orchestrate use cases

No infrastructure knowledge

Infrastructure

EF Core DbContext

Migrations

External services

Hidden behind interfaces

2. Minimal API Structure

Endpoints grouped by feature

Request/response DTOs only

Central response helpers

No domain objects returned directly

3. Async & Data Access

async/await everywhere

No blocking calls

Repositories for complex domains

No IQueryable leaking outside infrastructure

4. Validation & Security

Validate at API boundary

FluentValidation for complex rules

Structured validation errors

JWT with roles and permissions

Regular security reviews

✅ Engineering Principles & Quality Gates

SOLID principles

No duplicated logic

Shared utilities where needed

Testing

Unit tests:

Domain

Stores

Services

Integration tests:

APIs

Database

E2E tests:

Critical user flows

Quality Targets

No unchecked any

Linting enforced

Performance budgets:

<2s initial load

<500ms p95 API responses

🚀 Delivery Model

Vertical slices

Each slice includes:

UI

API

Persistence

Tests

Clear acceptance criteria

Working Practices

Short-lived branches

Conventional commits

CI on every PR

Nightly integration checks

🧾 Definition of Done

A feature is complete when:

UI uses signals and reactive forms

API endpoints implemented and validated

Errors logged and handled

Tests passing