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
      intro: user.intro == undefined ? new Array(12).join("0") : user.intro,
      level1: user.level1 == undefined ? new Array(39).join("0") : user.level1,
      level2: user.level2 == undefined ? new Array(32).join("0") : user.level2,
      level3: user.level3 == undefined ? new Array(23).join("0") : user.level3,
      level4: user.level4 == undefined ? new Array(15).join("0") : user.level4,
      bonus: user.bonus == undefined ? new Array(21).join("0") : user.bonus,
      levels: this.setLevelScore(user).toString()
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

  getLeaderboard(l: string): any {
    return this.http
      .get(this.baseURL + '/minesweeper-puzzles/leaderboard/?leaderboard=' + l)
      .pipe(
        map((data: any) => {
          return data;
        })
      );
  }

  setLevelScore(user:IUser) {
    let score = 0;
    let levels = [
      user.intro,
      user.level1,
      user.level2,
      user.level3,
      user.level4,
      user.bonus
    ];
    for (var level of levels) {
      score += this.checkStringForOnes(level);
    }
    return score;
  }

  checkStringForOnes(s: string): number {
    if (s == undefined) return 0;
    let oneCount = 0;
    for (let i=0; i<s.length; i++) {
      if (s.charAt(i) == '1') oneCount++;
    }
    return oneCount;
  }

}
