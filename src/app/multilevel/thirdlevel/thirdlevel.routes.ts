import { Route } from "@angular/router";
import { Third1Component } from "./third1/third1.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const THIRDLEVEL_ROUTE: Route[] = [
  {
    path: "third1",
    component: Third1Component,
  },
  { path: '**', component: Page404Component },
];

