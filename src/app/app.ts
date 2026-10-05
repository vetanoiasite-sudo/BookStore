import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** The application root. All chrome lives in the shell each route renders inside. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
