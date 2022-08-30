import { HttpClient } from '@angular/common/http'; 
import { Injectable } from '@angular/core';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AwsGatewayService {

  private baseURL: string = 'https://ttf9ggbci3.execute-api.us-west-2.amazonaws.com/dev/minesweeper-puzzles';

  constructor(private http: HttpClient) { }

  postLevels(email: string) {
    this.http.post(this.baseURL, {
      Email: email
    }).subscribe((data) => {
      console.log(data);
    });
  }
}
