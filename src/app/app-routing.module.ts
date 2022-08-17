import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BoardComponent } from './board/board.component';
import { HomePageComponent } from './home-page/home-page.component';
import { ProfileComponent } from './profile/profile.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { SignUpComponent } from './sign-up/sign-up.component';


const routes: Routes = [
  { path: 'board', component: BoardComponent},
  { path: 'signIn', component: SignInComponent},
  { path: 'signUp', component: SignUpComponent},
  { path: '', component: HomePageComponent},
  { path: 'profile', component: ProfileComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
