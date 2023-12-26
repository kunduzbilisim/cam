import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-first2',
  templateUrl: './first2.component.html',
  styleUrls: ['./first2.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent],
})
export class First2Component {
  breadscrums = [
    {
      title: 'First 2',
      items: ['Multilevel'],
      active: 'First 2',
    },
  ];

  constructor() {
    //constructor
  }
}
