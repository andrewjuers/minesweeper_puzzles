import { Component, OnInit } from '@angular/core';
import { IUser, CognitoService } from '../cognito.service';
import { AwsGatewayService } from '../aws-gateway.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  loading: boolean;
  user: IUser;

  constructor(private cognitoService: CognitoService, private awsGatewayService: AwsGatewayService) {
    this.loading = false;
    this.user = {} as IUser;
  }

  public ngOnInit(): void {
    this.cognitoService.getUser()
    .then((user: any) => {
      this.user = user.attributes;
      this.getUserInfo();
    });
  }

  public update(): void {
    this.loading = true;

    this.cognitoService.updateUser(this.user)
    .then(() => {
      this.loading = false;
    }).catch(() => {
      this.loading = false;
    });
  }

  getUserInfo() {
    this.awsGatewayService.getData(this.user.email).subscribe(
      (data:any) => {
        this.user.score = data.score == undefined ? 0 : Number(data.score["N"]);
        this.user.intro = data.intro["S"];
        this.user.level1 = data.level1["S"];
        this.user.level2 = data.level2["S"];
        this.user.level3 = data.level3["S"];
        this.user.level4 = data.level4["S"];
        this.user.bonus = data.bonus["S"];
        this.user.levels = this.awsGatewayService.setLevelScore(this.user);
      }
    );
  }

  getLevelsCleared(s: any): number {
    if (s == undefined) return 0;
    return this.awsGatewayService.checkStringForOnes(s);
  }

}
