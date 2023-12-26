import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-first3',
  templateUrl: './first3.component.html',
  styleUrls: ['./first3.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent],
})
export class First3Component {
  breadscrums = [
    {
      title: 'First 3',
      items: ['Multilevel'],
      active: 'First 3',
    },
  ];

  constructor() {
    // constructor
  }
}
