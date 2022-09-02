import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { IUser, CognitoService } from '../cognito.service';
import { AwsGatewayService } from '../aws-gateway.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css'],
})
export class SignInComponent {

  loading: boolean;
  user: IUser;

  constructor(private router: Router,
              private cognitoService: CognitoService,
              private awsGatewayService: AwsGatewayService) {
    this.loading = false;
    this.user = {} as IUser;
  }

  public signIn(): void {
    this.loading = true;
    this.cognitoService.signIn(this.user)
    .then(() => {
      this.getUserInfo();
      this.router.navigate(['/board']);
    }).catch(() => {
      this.loading = false;
    });
  }

  getUserInfo() {
    this.awsGatewayService.getData(this.user.email).subscribe(
      (data:any) => {
        this.user.score = Number(data.score["N"]);
        this.user.intro = data.intro["S"];
        this.user.level1 = data.level1["S"];
        this.user.level2 = data.level2["S"];
        this.user.level3 = data.level3["S"];
        this.user.level4 = data.level4["S"];
        this.user.bonus = data.bonus["S"];
        this.user.levels = data.levels['N'];
        this.awsGatewayService.postData(this.user);
      }
    );
  }

}