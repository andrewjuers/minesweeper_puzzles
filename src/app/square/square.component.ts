import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-square',
  templateUrl: './square.component.html',
  styleUrls: ['./square.component.css']
})
export class SquareComponent {

  @Input() value: 'B' | 'X' | number | undefined;
  @Input() color: string | undefined;

}
