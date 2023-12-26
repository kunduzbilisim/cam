import { Route } from "@angular/router";
import { Second1Component } from "./second1/second1.component";
import { Second2Component } from "./second2/second2.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const SECONDLEVEL_ROUTE: Route[] = [
  {
    path: "second1",
    component: Second1Component,
  },
  {
    path: "second2",
    component: Second2Component,
  },
  { path: '**', component: Page404Component },
];

