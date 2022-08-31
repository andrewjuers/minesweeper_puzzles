import { HttpClient } from '@angular/common/http'; 
import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { IUser } from './cognito.service';

@Injectable({
  providedIn: 'root'
})
export class AwsGatewayService {

  private baseURL: string = 'https://ttf9ggbci3.execute-api.us-west-2.amazonaws.com/dev';

  constructor(private http: HttpClient) { }

  postData(user:IUser) {
    this.http.post(this.baseURL + '/minesweeper-puzzles', {
      email: user.email,
      score: user.score == undefined ? "0" : user.score.toString(),
      intro: user.intro == undefined ? "00000000000" : user.intro,
      level1: user.level1 == undefined ? new Array(39).join("0") : user.level1,
      level2: user.level2 == undefined ? new Array(32).join("0") : user.level2,
      level3: user.level3 == undefined ? new Array(23).join("0") : user.level3,
      level4: user.level4 == undefined ? new Array(15).join("0") : user.level4,
      bonus: user.bonus == undefined ? new Array(21).join("0") : user.bonus
    }).subscribe((data) => {
      console.log(data);
    });
  }

  getData(e: string): any {
    return this.http
      .get(this.baseURL + '/minesweeper-puzzles/load/?email=' + e)
      .pipe(
        map((data: any) => {
          return data;
        })
      );
  }



}
