import { Route } from "@angular/router";
import { BlankComponent } from "./blank/blank.component";
import { Page404Component } from "app/authentication/page404/page404.component";
export const EXTRA_PAGES_ROUTE: Route[] = [
  {
    path: "blank",
    component: BlankComponent,
  },
  { path: '**', component: Page404Component },
];
