import { Page404Component } from '../authentication/page404/page404.component';
import { Route } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

export const STUDENT_ROUTE: Route[] = [
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  { path: '**', component: Page404Component },
];
