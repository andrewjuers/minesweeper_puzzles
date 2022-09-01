import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AwsGatewayService } from '../aws-gateway.service';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css']
})
export class HomePageComponent implements OnInit {

  topLevelClears: any;
  topPuzzlesSolved: any;

  constructor(private router: Router, private awsGatewayService: AwsGatewayService) { }

  ngOnInit(): void {
    this.awsGatewayService.getLeaderboard("levels").subscribe(
      (data:any) => {
        this.topLevelClears = data;
      }
    );
    this.awsGatewayService.getLeaderboard("score").subscribe(
      (data:any) => {
        this.topPuzzlesSolved = data;
      }
    )
  }

}
