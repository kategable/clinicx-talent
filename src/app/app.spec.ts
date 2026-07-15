import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { appReducer } from './core/store/app.reducer';
import { Home } from './features/home/home';

describe('Home', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), provideStore({ app: appReducer })],
    }),
  );

  it('renders the marketing paths and talent showcase', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Exceptional clinics deserve exceptional people.',
    );
    expect(fixture.nativeElement.textContent).toContain('Register your clinic');
    expect(fixture.nativeElement.textContent).toContain('Create a talent profile');
    expect(fixture.nativeElement.querySelectorAll('.talent-card')).toHaveLength(3);
  });
});
