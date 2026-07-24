---
name: angular-v22-conventions
description: Angular 22 and NgRx coding conventions for this project
metadata: 
  node_type: memory
  type: reference
  originSessionId: e5940a67-42da-4467-b179-bbd67d2d7374
  modified: 2026-07-23T15:08:55.070Z
---

# Angular 22 Coding Conventions

From AGENTS.md and project patterns:

## Component conventions
- Always standalone components (default in v20+ — never set `standalone: true`)
- Never set `changeDetection: ChangeDetectionStrategy.OnPush` (default in v22+)
- Use `inject()` instead of constructor injection
- Use `input()` and `output()` functions, not decorators
- Host bindings in `host` object of `@Component`/`@Directive`, never `@HostBinding`/`@HostListener`
- Native control flow: `@if`, `@for`, `@switch` — no `*ngIf`, `*ngFor`, `*ngSwitch`
- Use `class` bindings not `ngClass`; `style` bindings not `ngStyle`
- External templates/styles use paths relative to the component TS file

## Forms
- Signal Forms (`@angular/forms/signals`) — `form()`, `FormField`, `required()`, `pattern()`
- No ReactiveForms, no Template-driven forms

## Services
- `@Service` decorator for singleton services (Angular v22+)
- `@Injectable()` for services needing DI config
- `providedIn: 'root'` for singleton services when not using `@Service`

## State management (NgRx)
- Use signals for local component state, `computed()` for derived state
- NgRx for global state: `createActionGroup`, `createReducer`, `createEffect`
- `createFeatureSelector` + `createSelector` for selectors
- Never use `mutate` on signals, use `update` or `set`

## Testing
- Vitest with `vitest/globals` (describe/it/expect global)
- Reducer tests: import reducer directly, call sequentially to simulate action flows
- Component tests: `TestBed.configureTestingModule` with `provideRouter([])` and `provideStore({ app: appReducer })`

## TypeScript
- Strict mode enabled
- Avoid `any`; use `unknown` when uncertain
- Prefer type inference when obvious
