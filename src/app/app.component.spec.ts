import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let fixture:  ComponentFixture<AppComponent>;
  const authServiceSpy = jasmine.createSpyObj('AuthService',['isAuthenticated','signOut']);
  authServiceSpy.isAuthenticated.and.returnValue(false);
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'minesweeper-puzzles'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('minesweeper-puzzles');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content span')?.textContent).toContain('minesweeper-puzzles app is running!');
  });

  it('should have links for Home, Puzzles, and Sign In', () => {
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links[1].textContent).toEqual('Home');
    expect(links[2].textContent.toEqual('board'));
  })
});
