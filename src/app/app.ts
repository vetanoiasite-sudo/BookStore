import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiPreloader } from './shared/ui/preloader';

/** The application root. All chrome lives in the shell each route renders inside. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiPreloader],
  template: '<router-outlet /><ui-preloader />',
})
export class App {}
