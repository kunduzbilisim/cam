import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-blank',
  templateUrl: './blank.component.html',
  styleUrls: ['./blank.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent],
})
export class BlankComponent {
  breadscrums = [
    {
      title: 'Blank',
      items: ['Extra'],
      active: 'Blank',
    },
  ];
  constructor() {
    // constructor
  }
}
