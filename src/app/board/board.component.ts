import { Component, OnInit } from '@angular/core';
import { IUser, CognitoService } from '../cognito.service';
import { AwsGatewayService } from '../aws-gateway.service';
import { int } from 'aws-sdk/clients/datapipeline';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent implements OnInit {

  squares: any[] = [];
  mineSquares: any[] = [];
  hintColors: any[] = [];
  width = 5;
  height = 5;
  nextWidth = 5;
  nextHeight = 5;
  totalSquares = 25;
  numberOfMines = 8;
  complete = false;
  levels = [introLevels, levelOne, levelTwo, levelThree, levelFour, bonusLevels];
  currentPuzzleName = "Random";
  currentDisplayLevelsName = "";
  currentPuzzleNumber = 1;
  displayLevels: any = false;
  user:IUser;
  loading:boolean;
  won = false;
  mineImage = "assets/images/heart.png";
  blocking = false;

  constructor(private cognitoService: CognitoService, private awsGatewayService: AwsGatewayService) {
    this.loading = false;
    this.user = {} as IUser;
  }
  ngOnInit(w:number=5, h:number=5): void {
    this.cognitoService.getUser()
    .then((user) => {
      this.user.email = user.attributes["email"];
      this.getUserInfo();
    });
    this.width = w;
    this.height = h;
    this.newGame();
    this.newRandomPuzzle();
    
  }

  newGame(width=this.width, height=this.height) {
    this.width = width;
    this.height = height;
    this.totalSquares = width * height;
    this.squares = Array(this.totalSquares).fill(null);
    this.mineSquares = Array(this.totalSquares).fill(null);
    this.hintColors = Array(this.totalSquares).fill("black");
    // Set columns in css
    let main = document.getElementById("game-board");
    main?.setAttribute("style", "--columns: " + width + ";");
    // Reset gamestate
    this.won = false;
  }

  randomPuzzle() {
    // Random generated puzzle
    this.numberOfMines = Math.ceil(this.totalSquares / 3);
    for (let i=0; i<this.numberOfMines; i++) {
      this.addHint();
      this.addMine();
    }
    // Update mines and hints
    this.updateMines();
    this.updateHints();
    // Name random
    this.currentPuzzleName = "Random";
  }

  newRandomPuzzle(){
    this.newGame(this.nextWidth, this.nextHeight);
    this.randomPuzzle();
  }

  makeMove(idx: number) {
    if (this.squares[idx] == null) {
      this.squares.splice(idx, 1, 'B');
    }
    else if (this.squares[idx] == 'B') {
      let c: any = this.blocking ? 'X' : null;
      this.squares.splice(idx, 1, c);
    }
    else if (this.squares[idx] == 'X') {
      this.squares.splice(idx, 1, null);
    }
    this.updateHints();
  }

  randomEmptySquareIndex(): number {
    let idx = 0;
    do {
      idx = Math.floor(Math.random() * this.squares.length);
    } while (this.squares[idx] != null)
    return idx;
  }

  addMine() {
    this.squares.splice(this.randomEmptySquareIndex(), 1, 'B');
  }

  addHint() {
    this.squares.splice(this.randomEmptySquareIndex(), 1, 0);
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

  updateMines() {
    for (let i=0; i<this.squares.length; i++) {
      if (this.squares[i] == 'B') {
        this.mineSquares.splice(i, 1, 'B');
        this.squares.splice(i, 1, null);
      }
    }
  }

  updateHints() {
    // Cardinal directions
    let N = this.width * -1;
    let E = 1;
    let S = this.width;
    let W = -1;
    // Diagonal directions
    let NE = N + 1;
    let NW = N - 1;
    let SE = S + 1;
    let SW = S - 1;
    let adjacentSquareIndexDifferences = [N, E, W, S, NE, NW, SE, SW];
    let idx = -1;
    let done = true;
    for (let y=0; y<this.height; y++) {   // Loop columns
      for (let x=0; x<this.width; x++) {  // Loop rows
        idx++;
        if (this.squares[idx] == null || isNaN(this.squares[idx])) {  // Square is not a hint
          continue;
        }
        let adjacentSquareIndexes = [];
        for (let i=0; i<adjacentSquareIndexDifferences.length; i++) {
          adjacentSquareIndexes.push(adjacentSquareIndexDifferences[i] + idx);
        }
        if (y == 0) {               // Square is in the top row
          adjacentSquareIndexes = removeElements(adjacentSquareIndexes, [N + idx, NE + idx, NW + idx]);
        }
        if (x == 0) {               // Square is in the left column
          adjacentSquareIndexes = removeElements(adjacentSquareIndexes, [W + idx, NW + idx, SW + idx]);
        }
        if (x + 1 == this.width) {  // Square is in the right column
          adjacentSquareIndexes = removeElements(adjacentSquareIndexes, [E + idx, NE + idx, SE + idx]);
        }
        if (y + 1 == this.height) { // Square is in the bottom row
          adjacentSquareIndexes = removeElements(adjacentSquareIndexes, [S + idx, SE + idx, SW + idx]);
        }
        let guesses = 0;
        let mines = 0;
        for (let b=0; b<adjacentSquareIndexes.length; b++) {  // Loop through adjacent squares
          if (this.mineSquares[adjacentSquareIndexes[b]] == 'B') mines++; // Adjacent mine
          if (this.squares[adjacentSquareIndexes[b]] == 'B') guesses++;   // Adjacent guess
        }
        this.squares[idx] = mines;
        if (mines != guesses) { // Puzzle is not complete
          done = false;
        }
        this.hintColors[idx] = "black";
        if (mines > guesses) {
          this.hintColors[idx] = "blue";
        } else if (mines < guesses) {
          this.hintColors[idx] = "red";
        }
      }
    }
    this.complete = done
    if (done) this.winGame();
  }

  loadGame(info:any = introLevels[0], name="Random", nameNumber=0) {
    this.currentPuzzleName = name;
    if (nameNumber > 0) {
      this.currentPuzzleName = this.currentDisplayLevelsName + " - " + nameNumber;
      this.currentPuzzleNumber = nameNumber;
    }
    this.width = info["columns"];
    this.height = info["rows"];
    this.newGame();
    this.numberOfMines = 0;
    for (let i=0; i<this.totalSquares; i++) {
      if (info["board"][i] == 1) {
        this.squares.splice(i, 1, 0);
      } else if (info["board"][i] == 2) {
        this.squares.splice(i, 1, 'B')
        this.numberOfMines++;
      }
    }
    // Update mines and hints
    this.updateMines();
    this.updateHints();
    let x = this.getLevelSaveData(1);
  }

  toggleShowLevels(levels:any, name:string = "") {
    if (this.displayLevels == levels) {
      this.showLevels();
      this.currentDisplayLevelsName = "";
      return;
    }
    this.showLevels(levels);
    this.currentDisplayLevelsName = name;
  }

  showLevels(levels:any = false) {
    this.displayLevels = levels;
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
        this.postUserInfo();
      }
    );
  }

  postUserInfo() {
    this.awsGatewayService.postData(this.user);
  }

  winGame() {
    let idx = this.currentPuzzleNumber - 1;
    if (!this.won && (this.currentPuzzleName == "Random" || !this.getLevelSaveData(idx))) {
      this.user.score += 1;
      if (this.currentPuzzleName != "Random") this.getLevelSaveData(idx, true);
      this.postUserInfo();
    }
    this.won = true;
  }

  getLevelSaveData(idx: number, win=false): boolean {
    // Stop if user is not logged in
    if (this.user.email == undefined) return false;
    // Use regex to determine proper user atrribute
    const name = win ? this.currentPuzzleName.toLocaleLowerCase().replace(/\s+/g, '').match(/^[^-]*/) : this.currentDisplayLevelsName.toLocaleLowerCase().replace(/\s+/g, '');
    let levelString = "";
    let c = '';
    if (name == "intro") {
      levelString = this.user.intro;
      c = levelString.charAt(idx);
      if (win) {
        levelString = levelString.substring(0,idx) + '1' + levelString.substring(idx+1);
        this.user.intro = levelString;
      }
    }
    else if (name == "level1"){
      levelString = this.user.level1;
      c = levelString.charAt(idx);
      if (win) {
        levelString = levelString.substring(0,idx) + '1' + levelString.substring(idx+1);
        this.user.level1 = levelString;
      }
    }
    else if (name == "level2") {
      levelString = this.user.level2;
      c = levelString.charAt(idx);
      if (win) {
        levelString = levelString.substring(0,idx) + '1' + levelString.substring(idx+1);
        this.user.level2 = levelString;
      }
    }
    else if (name == "level3") {
      levelString = this.user.level3;
      c = levelString.charAt(idx);
      if (win) {
        levelString = levelString.substring(0,idx) + '1' + levelString.substring(idx+1);
        this.user.level3 = levelString;
      }
    } 
    else if (name == "level4") {
      levelString = this.user.level4;
      c = levelString.charAt(idx);
      if (win) {
        levelString = levelString.substring(0,idx) + '1' + levelString.substring(idx+1);
        this.user.level4 = levelString;
      }
    }
    else if (name == "bonus") {
      levelString = this.user.bonus;
      c = levelString.charAt(idx);
      if (win) {
        levelString = levelString.substring(0,idx) + '1' + levelString.substring(idx+1);
        this.user.bonus = levelString;
      }
    }
    else {
      return false;
    }
    if (win && this.currentPuzzleName != "Random") {
      this.postUserInfo();
      return true;
    }
    
    return c == '1';
  }

  toggleMineImage() {
    this.mineImage = this.mineImage == "assets/images/heart.png" ? "assets/images/mine.png" : "assets/images/heart.png";
  }

  toggleBlock() {
    this.blocking = !this.blocking;
    if (!this.blocking) {
      for (let i=0; i<this.squares.length; i++) {
        if (this.squares[i] == 'X') this.squares[i] = null; 
      } 
    }
  }

  clearBoard() {
    for (let i=0; i<this.squares.length; i++) {
      if (this.squares[i] == 'X' || this.squares[i] == 'B') this.squares[i] = null; 
    }
    this.updateHints();
  }

}

////##########################****************************************999999999999999999999966666



function removeElement(a:any[], e:any): any[] { // Remove element e from array a
  const index = a.indexOf(e)
  if (index >= 0) a.splice(index, 1)
  return a
}

function removeElements(a:any[], elements:any[]): any[] {  // Remove multiple elements from array a
  for (let i=0; i<elements.length; i++) {
      a = removeElement(a, elements[i])
  }
  return a
}

let introLevels = [ // 11 levels                                                                                    // 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12
{"rows": 3, "columns": 3, "board": [0, 0, 1,
                                    0, 2, 1,
                                    1, 1, 1]},

{"rows": 3, "columns": 4, "board": [0, 0, 0, 1,
                                    0, 2, 2, 1,
                                    1, 1, 1, 1]},

{"rows": 2, "columns": 5, "board": [0, 2, 2, 2, 0,
                                    1, 1, 1, 1, 1]},

{"rows": 6, "columns": 5, "board": [0, 2, 0, 2, 0,
                                    0, 1, 1, 1, 0,
                                    0, 1, 0, 1, 0,
                                    0, 1, 2, 1, 0,
                                    0, 1, 1, 1, 0,
                                    0, 0, 2, 0, 0]},

{"rows": 6, "columns": 5, "board": [0, 0, 2, 0, 0,
                                    0, 1, 1, 1, 0,
                                    0, 1, 0, 1, 0,
                                    0, 1, 2, 1, 0,
                                    0, 1, 1, 1, 0,
                                    0, 2, 0, 0, 0]},

{"rows": 5, "columns": 6, "board": [0, 2, 0, 0, 0, 0,
                                    0, 1, 1, 1, 1, 0,
                                    0, 1, 2, 0, 1, 2,
                                    2, 1, 1, 1, 1, 0,
                                    0, 0, 0, 0, 0, 0]},

{"rows": 6, "columns": 6, "board": [0, 0, 2, 2, 0, 0,
                                    0, 1, 1, 1, 1, 0,
                                    2, 1, 1, 1, 1, 2,
                                    2, 1, 1, 1, 1, 2,
                                    0, 1, 1, 1, 1, 0,
                                    0, 0, 2, 2, 0, 0]},

{"rows": 4, "columns": 4, "board": [1, 2, 0, 0,
                                    2, 0, 1, 0,
                                    0, 1, 0, 0,
                                    0, 0, 2, 1]},

{"rows": 4, "columns": 4, "board": [0, 0, 0, 2,
                                    2, 1, 0, 1,
                                    1, 0, 1, 2,
                                    2, 2, 0, 0]},

{"rows": 5, "columns": 5, "board": [1, 2, 1, 2, 2,
                                    2, 2, 1, 1, 2,
                                    1, 1, 1, 1, 1,
                                    1, 2, 1, 2, 2,
                                    2, 2, 1, 1, 2]},

{"rows": 6, "columns": 6, "board": [0, 2, 2, 2, 2, 0,
                                    2, 2, 1, 1, 2, 2,
                                    2, 1, 2, 2, 1, 2,
                                    2, 1, 2, 2, 1, 2,
                                    2, 2, 1, 1, 2, 2,
                                    0, 2, 2, 2, 2, 0]}

];

let levelOne = [ //38
{"rows": 5, "columns": 5, "board": [2, 2, 0, 1, 2,
                                    1, 1, 0, 1, 2,
                                    0, 0, 0, 0, 0,
                                    2, 1, 0, 1, 1,
                                    2, 1, 0, 2, 2]},

{"rows": 5, "columns": 5, "board": [1, 0, 2, 2, 1,
                                    0, 2, 1, 2, 0,
                                    1, 2, 0, 0, 1,
                                    2, 0, 1, 0, 2,
                                    1, 0, 0, 0, 1]},

{"rows": 5, "columns": 5, "board": [2, 0, 0, 2, 2,
                                    1, 0, 1, 2, 1,
                                    0, 0, 2, 2, 0,
                                    1, 2, 1, 0, 1,
                                    0, 2, 2, 0, 0]},

{"rows": 5, "columns": 5, "board": [0, 0, 1, 2, 0,
                                    1, 0, 2, 0, 1,
                                    2, 0, 1, 2, 2,
                                    1, 2, 0, 0, 1,
                                    2, 2, 1, 2, 2]},

{"rows": 5, "columns": 5, "board": [0, 2, 1, 0, 0,
                                    2, 1, 0, 1, 0,
                                    1, 0, 2, 0, 1,
                                    0, 1, 0, 1, 2,
                                    0, 0, 1, 2, 2]},

{"rows": 5, "columns": 5, "board": [0, 1, 0, 2, 0,
                                    2, 2, 1, 1, 2,
                                    1, 2, 0, 1, 0,
                                    0, 1, 2, 0, 1,
                                    0, 0, 1, 1, 2]},

{"rows": 5, "columns": 5, "board": [1, 2, 0, 1, 0,
                                    0, 0, 2, 0, 1,
                                    1, 0, 1, 2, 1,
                                    2, 1, 1, 0, 1,
                                    2, 0, 0, 2, 2]},

{"rows": 5, "columns": 5, "board": [2, 1, 0, 1, 0,
                                    0, 1, 0, 2, 2,
                                    2, 1, 2, 2, 1,
                                    0, 0, 0, 1, 2,
                                    2, 1, 0, 0, 0]},

{"rows": 5, "columns": 5, "board": [1, 2, 1, 1, 2,
                                    0, 0, 0, 1, 2,
                                    1, 0, 1, 0, 0,
                                    0, 2, 1, 2, 1,
                                    1, 2, 2, 0, 0]},

{"rows": 5, "columns": 5, "board": [2, 1, 2, 1, 2,
                                    2, 0, 0, 0, 0,
                                    0, 0, 1, 1, 1,
                                    1, 2, 0, 2, 0,
                                    0, 2, 1, 1, 0]},

{"rows": 5, "columns": 5, "board": [2, 1, 0, 1, 0,
                                    1, 0, 1, 0, 2,
                                    2, 2, 2, 1, 1,
                                    0, 1, 2, 1, 0,
                                    0, 0, 1, 2, 0]},

{"rows": 5, "columns": 5, "board": [1, 0, 0, 2, 2,
                                    0, 2, 1, 2, 1,
                                    2, 0, 1, 0, 1,
                                    2, 1, 1, 0, 0,
                                    2, 0, 0, 2, 1]},

{"rows": 5, "columns": 5, "board": [1, 0, 0, 2, 2,
                                    0, 2, 1, 2, 1,
                                    2, 0, 1, 0, 1,
                                    2, 1, 1, 0, 0,
                                    2, 0, 0, 2, 1]},

{"rows": 5, "columns": 5, "board": [1, 0, 0, 0, 0,
                                    2, 2, 1, 0, 1,
                                    2, 1, 0, 0, 2,
                                    2, 2, 1, 1, 0,
                                    0, 1, 0, 2, 0]},

{"rows": 5, "columns": 5, "board": [1, 2, 1, 1, 2,
                                    0, 2, 0, 2, 2,
                                    0, 1, 2, 0, 1,
                                    0, 1, 0, 2, 2,
                                    0, 0, 0, 1, 1,]},

{"rows": 5, "columns": 5, "board": [2, 2, 0, 1, 1,
                                    1, 0, 0, 1, 2,
                                    2, 1, 2, 2, 0,
                                    1, 0, 1, 0, 1,
                                    0, 1, 2, 0, 0]},

{"rows": 5, "columns": 5, "board": [0, 0, 2, 0, 0,    // replaced
                                    0, 1, 2, 1, 1,
                                    0, 1, 2, 2, 2,
                                    0, 0, 2, 1, 0,
                                    0, 1, 0, 0, 0]},

{"rows": 5, "columns": 5, "board": [2, 0, 1, 1, 1,
                                    2, 1, 0, 2, 0,
                                    2, 0, 1, 1, 2,
                                    1, 2, 1, 2, 2,
                                    1, 0, 0, 1, 0]},

{"rows": 5, "columns": 5, "board": [0, 1, 2, 2, 2,
                                    1, 2, 2, 0, 1,
                                    1, 2, 1, 0, 2,
                                    1, 0, 2, 1, 1,
                                    2, 0, 1, 0, 0]},

{"rows": 5, "columns": 5, "board": [2, 1, 0, 0, 0,
                                    2, 2, 0, 1, 0,
                                    2, 1, 2, 0, 0,
                                    0, 0, 2, 1, 2,
                                    0, 1, 0, 2, 1]},

{"rows": 5, "columns": 5, "board": [0, 0, 2, 1, 0,
                                    1, 2, 1, 2, 0,
                                    0, 0, 0, 0, 1,
                                    2, 1, 2, 1, 0,
                                    2, 2, 0, 0, 0]},

{"rows": 5, "columns": 5, "board": [1, 2, 1, 2, 1,
                                    0, 1, 0, 0, 2,
                                    2, 1, 0, 1, 0,
                                    1, 1, 0, 0, 0,
                                    0, 0, 2, 1, 0]},

{"rows": 5, "columns": 5, "board": [0, 1, 1, 1, 0,
                                    0, 2, 0, 2, 0,
                                    2, 1, 0, 1, 0,
                                    1, 2, 2, 0, 0,
                                    0, 0, 2, 1, 2]},

{"rows": 5, "columns": 5, "board": [0, 2, 0, 0, 0,
                                    2, 1, 1, 1, 0,
                                    1, 0, 0, 1, 2,
                                    0, 1, 1, 2, 0,
                                    1, 2, 2, 1, 2]},

{"rows": 5, "columns": 5, "board": [1, 2, 1, 2, 1,
                                    2, 2, 1, 0, 1,
                                    0, 2, 2, 2, 1,
                                    1, 0, 0, 0, 0,
                                    0, 1, 2, 1, 0]},

{"rows": 5, "columns": 5, "board": [0, 1, 1, 2, 0,
                                    0, 1, 2, 1, 2,
                                    2, 2, 2, 1, 2,
                                    2, 2, 2, 2, 0,
                                    1, 1, 1, 0, 1]},

{"rows": 5, "columns": 5, "board": [2, 0, 2, 2, 2,
                                    1, 2, 1, 1, 1,
                                    2, 1, 0, 0, 1,
                                    2, 2, 2, 1, 2,
                                    0, 1, 0, 1, 2]},

{"rows": 5, "columns": 5, "board": [2, 2, 1, 1, 2,
                                    1, 2, 2, 0, 0,
                                    2, 0, 1, 0, 1,
                                    1, 0, 2, 2, 1,
                                    0, 0, 1, 2, 2]},

{"rows": 5, "columns": 5, "board": [1, 0, 2, 2, 1,
                                    2, 1, 1, 0, 2,
                                    2, 2, 0, 1, 1,
                                    2, 1, 0, 2, 2,
                                    2, 2, 1, 1, 2]},

{"rows": 5, "columns": 5, "board": [2, 0, 2, 0, 2,
                                    0, 1, 1, 1, 2,
                                    2, 1, 0, 0, 1,
                                    2, 1, 0, 0, 1,
                                    2, 1, 0, 1, 2]},

{"rows": 5, "columns": 5, "board": [2, 2, 1, 2, 2,
                                    1, 0, 0, 1, 2,
                                    2, 1, 0, 0, 1,
                                    0, 2, 1, 2, 0,
                                    2, 1, 1, 1, 2]},

{"rows": 5, "columns": 5, "board": [2, 0, 2, 1, 2,
                                    2, 1, 1, 0, 0,
                                    2, 2, 1, 0, 1,
                                    2, 0, 1, 1, 2,
                                    1, 2, 1, 2, 2]},

{"rows": 5, "columns": 5, "board": [1, 2, 1, 1, 2,
                                    2, 2, 2, 0, 2,
                                    1, 1, 2, 1, 2,
                                    2, 2, 0, 1, 0,
                                    0, 1, 2, 1, 2]},

{"rows": 5, "columns": 5, "board": [0, 1, 2, 2, 2,    // fixed from author's website
                                    2, 2, 0, 1, 2,
                                    1, 1, 2, 2, 2,
                                    1, 2, 0, 1, 2,
                                    2, 2, 1, 2, 2]},

{"rows": 5, "columns": 5, "board": [0, 2, 0, 2, 0,    // fixed from author's email
                                    1, 2, 1, 1, 1,
                                    0, 2, 0, 2, 1,
                                    2, 1, 1, 0, 1,
                                    2, 2, 2, 2, 2]},

{"rows": 5, "columns": 5, "board": [2, 1, 0, 1, 0,
                                    0, 2, 0, 2, 0,
                                    1, 0, 1, 0, 1,
                                    0, 0, 2, 1, 2,
                                    2, 1, 0, 1, 0]},

{"rows": 5, "columns": 5, "board": [0, 0, 0, 0, 1,    // level 52 on website
                                    2, 2, 1, 1, 2,
                                    1, 1, 0, 2, 2,
                                    1, 1, 2, 1, 2,
                                    2, 2, 0, 2, 1]},

{"rows": 5, "columns": 5, "board": [0, 0, 0, 0, 0,
                                    2, 1, 1, 2, 2,
                                    2, 1, 0, 1, 2,
                                    2, 2, 1, 1, 1,
                                    2, 1, 2, 2, 0]},

];

let levelTwo = [ //31

{"rows": 6, "columns": 6, "board": [0, 0, 0, 1, 0, 0,      // Starting at #36 on the website
                                    2, 1, 2, 2, 0, 1,
                                    1, 0, 2, 1, 2, 2,
                                    0, 0, 1, 0, 2, 1,
                                    1, 0, 0, 0, 1, 0,
                                    0, 2, 1, 0, 0, 0,]},

{"rows": 6, "columns": 6, "board": [0, 0, 2, 1, 2, 0,
                                    0, 1, 0, 2, 1, 0,
                                    0, 0, 1, 0, 2, 1,
                                    1, 0, 2, 1, 2, 0,
                                    2, 1, 2, 0, 1, 0,
                                    0, 0, 1, 0, 0, 0,]},

{"rows": 6, "columns": 6, "board": [2, 0, 1, 0, 1, 2,
                                    1, 2, 0, 2, 2, 0,
                                    0, 0, 1, 1, 2, 1,
                                    1, 0, 1, 1, 2, 0,
                                    0, 2, 2, 2, 0, 1,
                                    2, 1, 0, 1, 2, 2,]},

{"rows": 6, "columns": 6, "board": [2, 2, 0, 1, 2, 2,
                                    1, 0, 1, 0, 1, 2,
                                    0, 1, 0, 0, 2, 2,
                                    0, 0, 2, 0, 1, 0,
                                    0, 1, 0, 1, 0, 1,
                                    0, 0, 1, 2, 2, 0,]},

{"rows": 6, "columns": 6, "board": [1, 0, 2, 2, 0, 1,
                                    0, 2, 1, 1, 0, 2,
                                    0, 1, 2, 0, 1, 0,
                                    0, 1, 2, 0, 1, 0,
                                    0, 2, 1, 1, 2, 0,
                                    1, 2, 2, 2, 0, 1,]},

{"rows": 6, "columns": 7, "board": [0, 1, 2, 0, 1, 2, 0,
                                    0, 1, 0, 0, 1, 1, 2,
                                    0, 1, 2, 0, 0, 1, 0,
                                    0, 1, 0, 0, 0, 1, 2,
                                    2, 1, 1, 1, 1, 1, 0,
                                    0, 0, 0, 2, 0, 0, 2]},

{"rows": 6, "columns": 6, "board": [2, 2, 2, 1, 2, 1,      // level 54
                                    2, 1, 0, 2, 1, 2,
                                    0, 0, 1, 2, 0, 1,
                                    1, 2, 2, 1, 2, 0,
                                    0, 1, 2, 0, 1, 2,
                                    1, 2, 1, 0, 2, 2,]},

{"rows": 6, "columns": 6, "board": [0, 2, 1, 1, 0, 1,  // 1
                                    0, 1, 2, 2, 0, 2,  // 3
                                    0, 0, 1, 0, 2, 1,  // 1
                                    1, 0, 0, 0, 2, 1,  // 1
                                    2, 2, 2, 2, 1, 0,  // 4
                                    1, 0, 1, 1, 0, 0,]},//1

{"rows": 6, "columns": 6, "board": [2, 2, 2, 0, 2, 0,
                                    2, 1, 1, 1, 1, 2,
                                    0, 1, 0, 0, 1, 2,
                                    0, 1, 2, 0, 1, 0,
                                    0, 1, 1, 1, 1, 0,
                                    2, 0, 2, 0, 0, 0,]},

{"rows": 6, "columns": 6, "board": [2, 1, 2, 2, 1, 0,
                                    1, 0, 0, 0, 2, 1,
                                    0, 2, 1, 1, 0, 2,
                                    0, 0, 1, 1, 0, 0,
                                    1, 0, 0, 2, 0, 1,
                                    0, 1, 2, 2, 1, 2,]},

{"rows": 7, "columns": 7, "board": [2, 2, 2, 2, 0, 0, 0,
                                    1, 0, 1, 1, 0, 1, 0,
                                    0, 1, 0, 0, 2, 0, 0,
                                    0, 0, 0, 1, 2, 1, 2,
                                    2, 1, 2, 0, 0, 1, 2,
                                    1, 2, 0, 0, 1, 0, 2,
                                    0, 1, 2, 0, 0, 1, 2,]},

{"rows": 6, "columns": 6, "board": [0, 0, 0, 2, 1, 2,
                                    1, 2, 1, 2, 1, 1,
                                    0, 0, 1, 2, 0, 0,
                                    1, 1, 2, 1, 1, 2,
                                    0, 2, 2, 0, 0, 2,
                                    1, 1, 1, 1, 2, 2,]},

{"rows": 6, "columns": 6, "board": [1, 2, 0, 2, 1, 2,
                                    2, 1, 2, 0, 1, 1,
                                    0, 0, 2, 1, 2, 0,
                                    1, 2, 1, 2, 2, 1,
                                    2, 0, 1, 0, 0, 2,
                                    2, 2, 1, 2, 1, 0]},

{"rows": 7, "columns": 7, "board": [1, 2, 1, 0, 2, 1, 2,  // level 65
                                    0, 0, 0, 0, 0, 0, 1,
                                    0, 1, 0, 0, 1, 0, 0,
                                    0, 0, 2, 1, 0, 0, 2,
                                    0, 1, 2, 0, 0, 2, 1,
                                    0, 0, 2, 0, 1, 0, 2,
                                    0, 0, 0, 1, 0, 0, 1]},

{"rows": 7, "columns": 7, "board": [0, 2, 1, 0, 0, 0, 2,
                                    0, 0, 0, 0, 1, 0, 1,
                                    2, 0, 1, 0, 0, 0, 2,
                                    1, 0, 0, 2, 1, 1, 0,
                                    0, 0, 1, 2, 0, 1, 0,
                                    0, 1, 0, 0, 2, 0, 0,
                                    0, 0, 2, 1, 2, 2, 1]},

{"rows": 7, "columns": 7, "board": [1, 2, 0, 0, 0, 2, 1,
                                    0, 0, 0, 0, 0, 0, 0,
                                    0, 1, 0, 0, 0, 1, 0,
                                    0, 0, 0, 2, 0, 2, 2,
                                    0, 1, 2, 1, 0, 2, 1,
                                    0, 0, 2, 0, 1, 0, 1,
                                    1, 2, 0, 0, 0, 0, 1,]},

{"rows": 7, "columns": 7, "board": [2, 1, 2, 0, 0, 0, 0,      // level 75
                                    1, 0, 0, 0, 2, 1, 0,
                                    0, 0, 1, 1, 0, 0, 1,
                                    0, 2, 1, 1, 2, 2, 2,
                                    0, 2, 2, 2, 0, 1, 0,
                                    1, 0, 0, 0, 1, 0, 0,
                                    0, 0, 0, 0, 0, 0, 0,]},

{"rows": 7, "columns": 7, "board": [0, 2, 1, 1, 0, 0, 0,
                                    0, 0, 0, 2, 0, 2, 0,
                                    0, 1, 0, 0, 1, 2, 0,
                                    2, 0, 1, 0, 0, 0, 0,
                                    1, 0, 0, 0, 2, 1, 0,
                                    2, 2, 0, 1, 0, 0, 0,
                                    0, 1, 0, 2, 2, 1, 0,]},

{"rows": 7, "columns": 7, "board": [0, 0, 0, 1, 0, 1, 2,
                                    0, 0, 0, 0, 2, 0, 2,
                                    1, 0, 0, 1, 1, 0, 0,
                                    0, 2, 2, 0, 0, 0, 2,
                                    0, 0, 1, 0, 1, 2, 1,
                                    2, 2, 1, 0, 0, 0, 2,
                                    1, 0, 0, 0, 0, 1, 0,]},

{"rows": 7, "columns": 7, "board": [0, 0, 0, 1, 2, 1, 2,
                                    1, 1, 0, 0, 0, 2, 1,
                                    2, 1, 2, 1, 0, 0, 0,
                                    0, 0, 0, 1, 1, 0, 0,
                                    0, 0, 0, 1, 1, 0, 2,
                                    0, 0, 2, 0, 2, 0, 1,
                                    0, 0, 1, 0, 0, 2, 2,
                                    0, 0, 0, 0, 0, 0, 0,]},

{"rows": 7, "columns": 7, "board": [0, 0, 0, 2, 1, 0, 0,
                                    0, 2, 1, 2, 0, 1, 0,
                                    1, 1, 0, 2, 2, 0, 0,
                                    2, 0, 1, 1, 0, 0, 0,
                                    1, 0, 0, 0, 2, 1, 0,
                                    0, 2, 0, 1, 0, 2, 2,
                                    0, 0, 1, 0, 0, 0, 1,]},

{"rows": 7, "columns": 7, "board": [0, 0, 0, 1, 0, 2, 1,      // 82
                                    0, 0, 2, 0, 0, 0, 2,
                                    0, 1, 0, 0, 1, 0, 0,
                                    2, 0, 1, 2, 0, 0, 0,
                                    1, 0, 0, 2, 1, 1, 0,
                                    2, 0, 0, 2, 0, 2, 0,
                                    1, 0, 1, 0, 0, 2, 1,]},

{"rows": 7, "columns": 7, "board": [2, 1, 2, 2, 1, 2, 0,
                                    0, 0, 2, 0, 0, 1, 0,
                                    1, 0, 2, 1, 0, 0, 0,
                                    0, 0, 1, 0, 0, 0, 0,
                                    0, 2, 0, 2, 1, 0, 1,
                                    0, 1, 0, 1, 0, 0, 2,
                                    0, 0, 0, 0, 0, 1, 2,]},

{"rows": 7, "columns": 7, "board": [1, 2, 2, 1, 0, 1, 0,
                                    0, 0, 2, 2, 0, 0, 2,
                                    0, 1, 0, 0, 1, 2, 1,
                                    0, 0, 0, 0, 0, 0, 0,
                                    0, 0, 0, 1, 0, 1, 0,
                                    0, 0, 2, 0, 2, 0, 0,
                                    0, 1, 0, 0, 2, 1, 2,]},

{"rows": 7, "columns": 7, "board": [2, 1, 2, 0, 0, 0, 0,
                                    0, 0, 0, 1, 0, 0, 1,
                                    2, 1, 0, 0, 0, 2, 0,
                                    1, 0, 0, 2, 1, 1, 0,
                                    2, 2, 1, 0, 2, 0, 1,
                                    0, 1, 0, 0, 1, 0, 2,
                                    0, 0, 0, 0, 0, 0, 2,]},

{"rows": 7, "columns": 7, "board": [2, 2, 1, 0, 0, 0, 0,
                                    1, 0, 0, 0, 0, 0, 0,
                                    2, 0, 1, 0, 1, 0, 2,
                                    0, 1, 0, 2, 0, 1, 2,
                                    0, 0, 1, 0, 0, 0, 1,
                                    0, 2, 2, 0, 1, 0, 2,
                                    0, 0, 0, 0, 0, 2, 1,]},

{"rows": 7, "columns": 7, "board": [1, 0, 0, 0, 2, 0, 1,
                                    2, 2, 1, 0, 1, 2, 0,
                                    1, 0, 0, 2, 2, 0, 1,
                                    0, 2, 0, 1, 0, 1, 0,
                                    0, 1, 1, 0, 1, 0, 0,
                                    0, 0, 0, 1, 1, 2, 2,
                                    0, 0, 2, 0, 0, 0, 1,]},

{"rows": 7, "columns": 7, "board": [0, 0, 0, 0, 0, 1, 0,
                                    0, 1, 2, 0, 2, 2, 0,
                                    0, 0, 2, 1, 1, 0, 0,
                                    0, 1, 0, 0, 0, 0, 1,
                                    0, 1, 2, 0, 0, 2, 2,
                                    0, 0, 0, 1, 2, 0, 1,
                                    1, 2, 0, 2, 1, 0, 0,]},

{"rows": 7, "columns": 7, "board": [0, 0, 0, 0, 0, 2, 1,
                                    1, 2, 0, 0, 1, 0, 0,
                                    0, 2, 1, 2, 0, 0, 1,
                                    0, 0, 1, 0, 0, 0, 2,
                                    1, 2, 1, 0, 1, 1, 2,
                                    2, 1, 0, 0, 2, 0, 1,
                                    0, 0, 2, 1, 0, 0, 0,]},

{"rows": 7, "columns": 7, "board": [2, 0, 0, 0, 1, 0, 2,      // skipping 91
                                    2, 1, 1, 0, 2, 1, 0,
                                    1, 2, 0, 1, 2, 1, 0,
                                    0, 0, 0, 2, 0, 0, 0,
                                    0, 0, 2, 1, 1, 0, 0,
                                    0, 1, 2, 0, 0, 2, 0,
                                    0, 0, 0, 0, 0, 0, 1,]},

{"rows": 8, "columns": 8, "board": [0, 1, 1, 1, 1, 0, 0, 0,
                                    0, 1, 2, 2, 1, 0, 0, 0,
                                    0, 1, 2, 1, 1, 1, 0, 0,
                                    0, 1, 1, 1, 2, 1, 0, 0,
                                    0, 0, 0, 1, 1, 1, 0, 0,
                                    1, 1, 1, 1, 2, 1, 0, 0,
                                    1, 2, 1, 2, 1, 1, 1, 1,
                                    2, 1, 1, 1, 1, 2, 1, 2,]},


];

let levelThree = [ //22

{"rows": 7, "columns": 7, "board": [0, 2, 2, 0, 2, 0, 2,       // Starting with level 42
                                    0, 1, 1, 1, 1, 1, 2,
                                    0, 1, 0, 2, 2, 1, 2,
                                    0, 0, 2, 1, 0, 0, 0,
                                    0, 1, 0, 2, 2, 1, 2,
                                    0, 1, 1, 1, 1, 1, 2,
                                    0, 2, 0, 0, 0, 2, 0,]},

{"rows": 7, "columns": 7, "board": [1, 2, 0, 1, 0, 2, 1,
                                    2, 1, 0, 2, 0, 1, 2,
                                    2, 2, 1, 2, 1, 0, 0,
                                    1, 2, 0, 2, 2, 0, 1,
                                    2, 2, 1, 2, 1, 0, 2,
                                    2, 1, 2, 0, 0, 1, 2,
                                    1, 2, 0, 1, 2, 2, 1,]},

{"rows": 7, "columns": 7, "board": [1, 2, 2, 2, 2, 2, 1,
                                    0, 2, 1, 2, 1, 2, 2,
                                    0, 1, 0, 2, 2, 1, 0,
                                    0, 0, 2, 1, 2, 0, 0,
                                    2, 1, 2, 2, 0, 1, 2,
                                    0, 2, 1, 2, 1, 2, 2,
                                    1, 2, 2, 2, 0, 2, 1,]},

{"rows": 7, "columns": 7, "board": [0, 2, 0, 1, 2, 2, 1,
                                    0, 1, 1, 0, 0, 1, 2,
                                    2, 1, 1, 2, 1, 0, 2,
                                    1, 2, 2, 0, 2, 0, 1,
                                    2, 2, 1, 2, 1, 1, 0,
                                    2, 1, 0, 0, 1, 1, 2,
                                    1, 2, 0, 1, 2, 2, 0,]},

{"rows": 7, "columns": 7, "board": [2, 1, 2, 0, 1, 2, 2,
                                    0, 1, 0, 0, 2, 1, 0,
                                    0, 1, 1, 2, 1, 0, 1,
                                    2, 2, 0, 2, 2, 0, 2,
                                    1, 0, 1, 2, 1, 1, 0,
                                    2, 1, 0, 2, 2, 1, 0,
                                    0, 0, 1, 0, 0, 1, 0,]},

{"rows": 7, "columns": 7, "board": [1, 2, 2, 1, 0, 0, 0,       // level 61
                                    2, 1, 2, 2, 1, 2, 2,
                                    0, 2, 1, 2, 0, 1, 2,
                                    1, 1, 0, 2, 1, 1, 1,
                                    0, 1, 2, 2, 0, 0, 2,
                                    0, 1, 0, 1, 2, 1, 2,
                                    1, 2, 1, 0, 1, 2, 1,]},

{"rows": 7, "columns": 7, "board": [2, 2, 2, 1, 0, 0, 0,
                                    0, 0, 0, 1, 1, 0, 1,
                                    0, 1, 0, 0, 2, 0, 2,
                                    0, 1, 2, 1, 2, 1, 0,
                                    0, 0, 0, 0, 0, 1, 0,
                                    0, 1, 2, 0, 1, 0, 0,
                                    0, 0, 2, 1, 0, 2, 1,]},

{"rows": 7, "columns": 7, "board": [0, 0, 0, 0, 0, 2, 1,
                                    0, 1, 0, 0, 1, 0, 2,
                                    0, 0, 2, 0, 0, 1, 1,
                                    1, 2, 1, 0, 2, 0, 0,
                                    0, 2, 1, 1, 0, 1, 0,
                                    2, 2, 0, 0, 0, 0, 0,
                                    1, 0, 1, 2, 1, 2, 0,]},

{"rows": 7, "columns": 7, "board": [0, 0, 1, 2, 1, 0, 1,
                                    0, 2, 0, 0, 0, 2, 0,
                                    1, 0, 2, 1, 0, 0, 1,
                                    0, 0, 2, 1, 0, 1, 0,
                                    0, 1, 0, 2, 2, 1, 0,
                                    2, 0, 1, 0, 0, 0, 1,
                                    1, 0, 0, 0, 0, 2, 2,]},

{"rows": 7, "columns": 7, "board": [0, 2, 1, 2, 1, 0, 2,
                                    1, 0, 2, 0, 0, 0, 1,
                                    0, 0, 1, 1, 0, 2, 0,
                                    1, 2, 0, 0, 1, 1, 0,
                                    2, 0, 1, 2, 0, 0, 0,
                                    1, 0, 0, 0, 1, 0, 2,
                                    0, 0, 2, 0, 0, 0, 1,]},

{"rows": 7, "columns": 7, "board": [0, 0, 1, 0, 0, 2, 1,
                                    2, 2, 0, 0, 0, 0, 0,
                                    1, 0, 1, 0, 2, 2, 1,
                                    2, 0, 0, 0, 1, 2, 0,
                                    0, 1, 0, 1, 0, 2, 0,
                                    0, 0, 2, 0, 1, 0, 1,
                                    2, 1, 0, 1, 0, 0, 0,]},

{"rows": 7, "columns": 7, "board": [1, 0, 2, 1, 2, 0, 0,
                                    2, 0, 0, 0, 1, 0, 1,
                                    0, 1, 1, 0, 0, 2, 0,
                                    1, 0, 1, 2, 1, 0, 0,
                                    0, 2, 0, 0, 0, 2, 0,
                                    1, 0, 1, 0, 2, 0, 1,
                                    2, 0, 0, 1, 2, 0, 0,]},

{"rows": 7, "columns": 7, "board": [2, 0, 0, 0, 0, 1, 2,
                                    1, 0, 1, 0, 1, 0, 2,
                                    2, 0, 1, 2, 2, 0, 0,
                                    0, 1, 0, 1, 0, 0, 0,
                                    0, 0, 0, 1, 0, 1, 2,
                                    0, 0, 2, 0, 0, 2, 1,
                                    0, 1, 2, 1, 0, 0, 0,]},

{"rows": 7, "columns": 7, "board": [0, 1, 2, 0, 0, 0, 0,
                                    2, 2, 0, 1, 2, 0, 0,
                                    1, 1, 0, 0, 2, 1, 0,
                                    0, 0, 1, 0, 0, 0, 0,
                                    0, 2, 0, 0, 1, 2, 0,
                                    1, 1, 2, 0, 0, 2, 1,
                                    0, 0, 2, 1, 0, 0, 0,]},

{"rows": 7, "columns": 7, "board": [2, 1, 1, 0, 0, 0, 0,
                                    0, 2, 2, 0, 1, 0, 0,
                                    1, 0, 0, 2, 0, 2, 1,
                                    0, 0, 1, 0, 0, 2, 1,
                                    0, 2, 1, 1, 0, 1, 0,
                                    1, 2, 0, 0, 2, 0, 2,
                                    0, 0, 0, 0, 1, 1, 0,]},

{"rows": 8, "columns": 8, "board": [2, 1, 1, 0, 0, 1, 0, 2,       // 48
                                    0, 2, 2, 0, 1, 0, 2, 1,
                                    1, 2, 0, 1, 0, 2, 2, 1,
                                    2, 1, 2, 0, 0, 1, 2, 2,
                                    2, 2, 1, 2, 2, 2, 1, 2,
                                    1, 2, 2, 2, 1, 0, 2, 1,
                                    1, 0, 2, 1, 0, 2, 2, 2,
                                    2, 0, 1, 2, 2, 1, 1, 2,]},

{"rows": 8, "columns": 8, "board": [2, 2, 1, 0, 0, 1, 2, 0,
                                    0, 1, 0, 2, 1, 2, 1, 2,
                                    0, 1, 2, 1, 2, 2, 1, 0,
                                    1, 0, 2, 2, 1, 1, 0, 1,
                                    1, 2, 1, 1, 2, 0, 2, 1,
                                    2, 1, 2, 0, 1, 2, 1, 2,
                                    2, 1, 0, 1, 2, 2, 1, 2,
                                    2, 2, 1, 0, 0, 1, 2, 2,]},

{"rows": 8, "columns": 8, "board": [0, 0, 0, 0, 2, 1, 2, 0,
                                    1, 0, 1, 1, 2, 2, 1, 0,
                                    2, 1, 2, 2, 1, 2, 0, 1,
                                    2, 2, 1, 1, 2, 0, 1, 2,
                                    2, 1, 0, 2, 1, 1, 0, 2,
                                    1, 2, 0, 1, 2, 0, 1, 2,
                                    0, 1, 2, 2, 1, 1, 0, 1,
                                    0, 2, 1, 2, 0, 0, 0, 2,]},

{"rows": 8, "columns": 8, "board": [1, 2, 0, 2, 1, 0, 1, 0,
                                    2, 1, 2, 1, 2, 2, 0, 1,
                                    2, 2, 1, 2, 0, 1, 2, 0,
                                    1, 0, 2, 2, 1, 2, 1, 2,
                                    0, 1, 0, 1, 0, 2, 2, 1,
                                    0, 2, 1, 2, 2, 1, 0, 0,
                                    1, 2, 2, 2, 1, 2, 1, 2,
                                    0, 1, 2, 1, 0, 2, 2, 1,]},

{"rows": 8, "columns": 8, "board": [2, 1, 2, 1, 0, 2, 1, 0,   // 62
                                    1, 0, 1, 2, 1, 2, 2, 1,
                                    0, 2, 2, 1, 0, 2, 1, 1,
                                    1, 2, 0, 0, 2, 1, 2, 0,
                                    2, 1, 1, 2, 0, 2, 2, 1,
                                    0, 1, 2, 1, 2, 1, 1, 2,
                                    1, 0, 0, 1, 0, 1, 0, 2,
                                    2, 2, 0, 0, 1, 2, 1, 0,]},

{"rows": 8, "columns": 8, "board": [0, 0, 2, 1, 1, 0, 0, 0,
                                    0, 0, 1, 0, 0, 1, 2, 2,
                                    0, 1, 0, 0, 2, 0, 1, 2,
                                    1, 2, 2, 1, 1, 0, 0, 1,
                                    1, 2, 0, 1, 1, 2, 2, 1,
                                    2, 1, 0, 0, 2, 0, 1, 2,
                                    0, 0, 1, 0, 2, 1, 0, 2,
                                    0, 0, 2, 1, 1, 0, 0, 0,]},

{"rows": 8, "columns": 8, "board": [2, 2, 0, 1, 1, 2, 2, 2,   // 47
                                    0, 1, 1, 0, 2, 1, 1, 2,
                                    2, 1, 2, 0, 2, 0, 1, 2,
                                    1, 2, 2, 1, 1, 2, 0, 1,
                                    1, 2, 0, 1, 1, 0, 0, 1,
                                    2, 1, 0, 2, 2, 0, 1, 2,
                                    2, 1, 1, 0, 2, 1, 1, 2,
                                    2, 0, 2, 1, 1, 0, 0, 0,]},

];

let levelFour = [ //14

{"rows": 9, "columns": 9, "board": [1, 2, 1, 2, 1, 0, 1, 2, 1,
                                    2, 2, 0, 0, 1, 2, 2, 2, 0,
                                    1, 0, 1, 2, 1, 0, 1, 2, 1,
                                    0, 2, 2, 1, 2, 1, 2, 2, 2,
                                    0, 1, 1, 0, 2, 2, 1, 1, 0,
                                    2, 0, 2, 1, 0, 1, 2, 2, 0,
                                    1, 0, 1, 2, 1, 0, 1, 0, 1,
                                    2, 2, 0, 0, 1, 2, 2, 2, 2,
                                    1, 2, 1, 0, 1, 0, 1, 2, 1,]},

{"rows": 9, "columns": 9, "board": [1, 2, 0, 2, 1, 0, 2, 2, 1,
                                    2, 1, 2, 1, 2, 1, 0, 1, 2,
                                    0, 2, 1, 2, 0, 2, 1, 0, 2,
                                    0, 1, 2, 1, 0, 1, 0, 1, 2,
                                    1, 2, 2, 0, 0, 2, 2, 2, 1,
                                    2, 1, 2, 1, 2, 1, 0, 1, 0,
                                    0, 2, 1, 0, 2, 2, 1, 2, 2,
                                    2, 1, 2, 1, 2, 1, 2, 1, 2,
                                    1, 2, 0, 0, 1, 0, 2, 2, 1,]},

{"rows": 9, "columns": 9, "board": [0, 1, 0, 2, 0, 2, 0, 1, 2,
                                    0, 0, 2, 1, 1, 1, 2, 2, 0,
                                    1, 1, 1, 2, 0, 2, 1, 1, 1,
                                    2, 2, 2, 1, 2, 1, 0, 2, 2,
                                    0, 1, 0, 1, 2, 1, 2, 1, 2,
                                    0, 0, 2, 1, 0, 1, 0, 2, 2,
                                    1, 1, 1, 2, 2, 0, 1, 1, 1,
                                    0, 2, 0, 1, 1, 1, 0, 0, 2,
                                    0, 1, 2, 0, 0, 0, 2, 1, 2,]},

{"rows": 9, "columns": 9, "board": [2, 1, 2, 2, 1, 2, 0, 1, 0,
                                    0, 0, 1, 0, 2, 1, 2, 0, 1,
                                    1, 2, 2, 1, 0, 2, 1, 2, 2,
                                    2, 1, 0, 0, 1, 2, 0, 1, 0,
                                    2, 2, 1, 0, 2, 1, 2, 2, 1,
                                    1, 0, 2, 1, 0, 2, 1, 2, 0,
                                    2, 1, 2, 0, 1, 2, 2, 1, 2,
                                    2, 2, 1, 2, 0, 1, 0, 2, 1,
                                    1, 0, 2, 1, 2, 0, 1, 2, 0,]},

{"rows": 9, "columns": 9, "board": [2, 0, 1, 2, 1, 2, 1, 0, 2,
                                    1, 1, 2, 1, 1, 1, 2, 1, 1,
                                    0, 1, 0, 0, 2, 2, 0, 1, 2,
                                    2, 2, 1, 0, 1, 2, 1, 2, 0,
                                    1, 2, 1, 0, 1, 2, 1, 0, 1,
                                    0, 2, 1, 0, 1, 0, 1, 2, 2,
                                    2, 1, 0, 0, 0, 2, 0, 1, 0,
                                    1, 1, 2, 1, 1, 1, 2, 1, 1,
                                    2, 0, 1, 2, 1, 0, 1, 0, 2,]},

{"rows": 9, "columns": 9, "board": [0, 0, 2, 0, 0, 0, 0, 0, 0,
                                    2, 1, 2, 1, 2, 1, 1, 2, 1,
                                    0, 1, 0, 0, 2, 1, 0, 1, 2,
                                    1, 2, 1, 1, 1, 2, 1, 2, 1,
                                    0, 0, 0, 0, 2, 0, 0, 0, 2,
                                    2, 1, 0, 1, 1, 1, 1, 2, 1,
                                    1, 0, 0, 0, 0, 0, 2, 2, 0,
                                    2, 2, 1, 1, 2, 2, 1, 2, 1,
                                    0, 2, 1, 1, 1, 2, 0, 1, 2,]},

{"rows": 10, "columns": 10, "board": [1, 2, 2, 2, 1, 1, 2, 2, 2, 1,
                                      2, 1, 2, 1, 0, 2, 1, 2, 1, 2,
                                      0, 2, 1, 2, 1, 2, 0, 1, 2, 2,
                                      2, 1, 2, 0, 1, 0, 1, 2, 1, 0,
                                      1, 2, 1, 1, 1, 2, 2, 0, 2, 1,
                                      1, 2, 2, 2, 0, 1, 1, 1, 2, 1,
                                      2, 1, 0, 1, 2, 1, 0, 2, 1, 0,
                                      2, 2, 1, 0, 2, 1, 0, 1, 2, 2,
                                      2, 1, 2, 1, 2, 2, 1, 0, 1, 2,
                                      1, 2, 0, 2, 1, 1, 0, 2, 2, 1,]},

{"rows": 10, "columns": 10, "board": [1, 0, 1, 2, 1, 2, 0, 2, 1, 1,
                                      1, 2, 0, 1, 2, 0, 1, 1, 2, 0,
                                      0, 1, 2, 0, 0, 1, 0, 2, 2, 1,
                                      2, 1, 0, 0, 1, 2, 0, 0, 1, 2,
                                      2, 2, 1, 0, 2, 2, 1, 0, 2, 1,
                                      1, 2, 0, 1, 2, 2, 0, 1, 2, 2,
                                      2, 1, 0, 2, 2, 1, 0, 0, 1, 2,
                                      1, 0, 2, 2, 1, 2, 2, 0, 1, 0,
                                      2, 0, 1, 1, 0, 2, 1, 2, 2, 1,
                                      1, 1, 2, 0, 0, 1, 2, 1, 2, 1,]},

{"rows": 10, "columns": 10, "board": [2, 1, 1, 2, 1, 0, 1, 0, 2, 2,
                                      2, 1, 0, 0, 1, 2, 0, 2, 1, 1,
                                      2, 0, 2, 1, 2, 1, 1, 2, 2, 1,
                                      1, 2, 1, 2, 2, 1, 2, 1, 2, 2,
                                      2, 2, 1, 1, 2, 0, 2, 2, 1, 1,
                                      1, 1, 2, 0, 2, 2, 1, 1, 2, 2,
                                      0, 2, 1, 0, 1, 2, 2, 1, 2, 1,
                                      1, 2, 2, 1, 1, 2, 1, 2, 2, 2,
                                      1, 1, 2, 2, 0, 1, 2, 2, 1, 0,
                                      2, 2, 2, 1, 2, 1, 0, 1, 1, 0,]},

{"rows": 10, "columns": 10, "board": [1, 0, 1, 0, 0, 1, 0, 2, 1, 0,
                                      2, 0, 0, 1, 2, 0, 1, 0, 0, 2,
                                      2, 2, 2, 0, 1, 1, 0, 1, 1, 0,
                                      1, 0, 1, 0, 1, 0, 1, 2, 1, 0,
                                      1, 0, 1, 2, 0, 0, 1, 1, 0, 2,
                                      2, 2, 0, 0, 1, 2, 2, 0, 2, 1,
                                      1, 2, 0, 0, 0, 1, 0, 0, 1, 0,
                                      1, 1, 2, 1, 2, 0, 1, 2, 1, 2,
                                      2, 2, 0, 1, 2, 0, 0, 2, 1, 0,
                                      1, 2, 0, 1, 0, 1, 0, 0, 1, 0,]},

{"rows": 10, "columns": 10, "board": [0, 0, 1, 2, 2, 0, 0, 0, 1, 2,   // india
                                      2, 1, 0, 1, 1, 1, 1, 0, 0, 2,   // SetA/6B6-001
                                      1, 2, 0, 0, 0, 2, 0, 1, 1, 2,
                                      1, 0, 0, 2, 0, 1, 1, 1, 2, 1,
                                      2, 0, 1, 0, 1, 2, 0, 1, 2, 0,
                                      1, 0, 1, 2, 0, 0, 2, 0, 1, 0,
                                      0, 2, 1, 0, 1, 2, 1, 1, 2, 0,
                                      1, 0, 0, 0, 2, 1, 2, 2, 0, 0,
                                      2, 2, 0, 0, 2, 0, 0, 1, 2, 1,
                                      1, 0, 0, 1, 2, 1, 0, 0, 1, 2,]},

{"rows": 10, "columns": 10, "board": [2, 2, 2, 2, 1, 0, 0, 0, 0, 0,
                                      2, 1, 2, 1, 1, 2, 0, 0, 2, 0,
                                      1, 1, 0, 2, 1, 0, 0, 1, 1, 1,
                                      0, 2, 2, 1, 0, 0, 0, 1, 2, 2,
                                      0, 1, 1, 1, 0, 0, 0, 1, 2, 1,
                                      0, 0, 1, 2, 1, 1, 2, 1, 0, 0,
                                      1, 2, 1, 2, 2, 1, 1, 1, 1, 0,
                                      2, 1, 1, 1, 2, 1, 0, 2, 2, 0,
                                      0, 0, 0, 0, 1, 1, 1, 1, 1, 0,
                                      0, 0, 0, 0, 0, 2, 0, 0, 0, 0,]},

{"rows": 10, "columns": 10, "board": [0, 1, 2, 0, 1, 0, 0, 0, 1, 0,   // Phil's 10x10
                                      0, 2, 1, 1, 0, 2, 2, 1, 0, 2,
                                      1, 2, 2, 0, 0, 1, 2, 2, 1, 2,
                                      0, 0, 2, 0, 1, 2, 0, 1, 2, 1,
                                      2, 1, 2, 0, 0, 1, 1, 0, 0, 0,
                                      0, 2, 2, 0, 2, 2, 1, 2, 1, 2,
                                      0, 1, 1, 1, 1, 0, 0, 0, 0, 2,
                                      2, 0, 2, 0, 1, 2, 2, 1, 0, 1,
                                      0, 1, 1, 0, 0, 0, 1, 2, 0, 0,
                                      1, 0, 0, 0, 0, 1, 2, 2, 2, 1,]},

{"rows": 10, "columns": 10, "board": [1, 2, 1, 0, 0, 1, 0, 0, 0, 0,   // 11
                                      0, 0, 2, 0, 2, 2, 0, 1, 1, 0,
                                      1, 1, 0, 0, 1, 0, 0, 0, 2, 2,
                                      2, 0, 1, 2, 1, 1, 2, 2, 0, 1,
                                      0, 1, 0, 1, 2, 1, 1, 1, 0, 2,
                                      0, 1, 1, 2, 0, 0, 2, 1, 0, 0,
                                      2, 2, 0, 2, 0, 0, 0, 1, 2, 0,
                                      1, 0, 0, 2, 0, 1, 0, 2, 1, 2,
                                      2, 1, 2, 1, 0, 2, 2, 0, 0, 1,
                                      1, 0, 1, 1, 0, 1, 1, 2, 1, 2,]},

];

let bonusLevels = [ //20

{"rows": 4, "columns": 10, "board": [0, 0, 0, 1, 1, 2, 1, 1, 0, 2,     // apr2
                                    2, 1, 1, 2, 0, 0, 0, 2, 1, 1,
                                    1, 0, 0, 0, 1, 0, 2, 1, 1, 0,
                                    2, 1, 2, 1, 0, 2, 1, 2, 0, 0,]},

{"rows": 6, "columns": 6, "board": [0, 1, 2, 0, 1, 0,                  // mar11
                                    1, 0, 0, 1, 2, 1,
                                    2, 1, 0, 0, 2, 2,
                                    2, 1, 2, 2, 1, 1,
                                    1, 2, 0, 0, 1, 0,
                                    0, 1, 1, 2, 2, 2,]},

{"rows": 6, "columns": 6, "board": [2, 1, 1, 0, 2, 1,  // mar11-2
                                    0, 2, 0, 2, 1, 2,
                                    1, 2, 0, 1, 0, 0,
                                    2, 1, 0, 2, 1, 2,
                                    1, 2, 2, 1, 2, 1,
                                    0, 0, 0, 1, 1, 0,]},

{"rows": 9, "columns": 9, "board": [0, 1, 0, 2, 2, 1, 1, 1, 0, // mar11-3
                                    0, 2, 1, 2, 1, 2, 1, 2, 1,
                                    1, 0, 1, 1, 2, 0, 1, 2, 0,
                                    1, 2, 2, 2, 1, 2, 1, 0, 2,
                                    0, 1, 2, 0, 1, 0, 1, 2, 1,
                                    2, 0, 0, 1, 1, 2, 0, 2, 1,
                                    0, 1, 1, 0, 2, 1, 1, 0, 0,
                                    1, 0, 1, 2, 2, 1, 0, 1, 2,
                                    0, 0, 0, 2, 2, 1, 0, 1, 2,]},

{"rows": 6, "columns": 6, "board": [0, 1, 2, 2, 0, 1,  // mar12
                                    1, 0, 1, 2, 1, 2,
                                    2, 2, 1, 1, 1, 0,
                                    0, 2, 0, 2, 1, 0,
                                    0, 1, 2, 1, 0, 2,
                                    1, 2, 1, 2, 1, 2,]},

{"rows": 5, "columns": 7, "board": [2, 1, 2, 0, 1, 0, 2,   // mar12-2
                                    0, 0, 1, 1, 2, 1, 0,
                                    2, 1, 0, 0, 0, 1, 0,
                                    0, 1, 1, 1, 0, 1, 0,
                                    0, 1, 2, 2, 1, 2, 1,]},

{"rows": 6, "columns": 6, "board": [2, 1, 0, 0, 1, 2,  // mar12-random
                                    1, 0, 0, 1, 0, 0,
                                    0, 0, 1, 2, 1, 2,
                                    2, 1, 1, 0, 0, 0,
                                    1, 2, 1, 2, 1, 1,
                                    2, 1, 0, 1, 0, 2,]},

{"rows": 6, "columns": 6, "board": [0, 1, 0, 2, 1, 0,  // mar14
                                    1, 2, 0, 1, 0, 1,
                                    1, 2, 2, 0, 2, 2,
                                    2, 1, 2, 2, 1, 1,
                                    1, 0, 1, 0, 0, 2,
                                    2, 2, 2, 1, 1, 0,]},

{"rows": 10, "columns": 10, "board": [0, 1, 0, 2, 1, 1, 0, 1, 0, 0,    // mar15
                                      1, 0, 2, 1, 2, 2, 2, 2, 1, 1,
                                      2, 0, 2, 1, 0, 2, 1, 0, 2, 2,
                                      2, 0, 1, 1, 0, 1, 1, 1, 2, 0,
                                      1, 1, 0, 1, 0, 2, 1, 2, 1, 0,
                                      0, 1, 2, 0, 0, 1, 2, 1, 2, 1,
                                      2, 2, 2, 2, 1, 1, 2, 1, 0, 0,
                                      1, 0, 1, 2, 1, 0, 0, 2, 1, 1,
                                      0, 1, 0, 1, 2, 0, 0, 0, 1, 2,
                                      1, 2, 2, 0, 1, 1, 1, 2, 0, 1,]},

{"rows": 6, "columns": 6, "board": [2, 2, 0, 1, 2, 1,     // mar26
                                    2, 1, 1, 0, 2, 1,
                                    1, 0, 1, 0, 2, 2,
                                    2, 1, 2, 2, 2, 1,
                                    1, 0, 0, 1, 1, 0,
                                    2, 1, 2, 2, 2, 2,]},

{"rows": 6, "columns": 6, "board": [0, 2, 1, 0, 0, 0,     // mar26-2
                                    0, 1, 0, 1, 1, 0,
                                    1, 2, 0, 1, 2, 2,
                                    0, 1, 0, 0, 1, 0,
                                    1, 1, 1, 1, 2, 1,
                                    0, 2, 0, 0, 2, 0,]},

{"rows": 6, "columns": 6, "board": [2, 1, 1, 0, 1, 0,     // mar27
                                    0, 1, 2, 1, 0, 2,
                                    2, 1, 0, 2, 1, 0,
                                    2, 2, 2, 2, 2, 1,
                                    2, 0, 1, 2, 0, 1,
                                    2, 1, 2, 2, 1, 2,]},

{"rows": 5, "columns": 5, "board": [2, 2, 1, 1, 1,    // original app
                                    1, 2, 2, 0, 2,
                                    2, 0, 1, 2, 1,
                                    0, 2, 0, 0, 1,
                                    1, 0, 1, 1, 2,]},

{"rows": 6, "columns": 6, "board": [0, 0, 0, 2, 2, 2,     // india
                                    1, 2, 2, 1, 1, 2,     // SetA/6B6-011
                                    2, 0, 1, 0, 0, 2,
                                    1, 1, 1, 2, 1, 2,
                                    2, 0, 0, 2, 2, 2,
                                    2, 2, 1, 1, 2, 1,]},

{"rows": 6, "columns": 6, "board": [2, 2, 0, 0, 0, 1,     // india
                                    2, 2, 1, 1, 2, 2,     // SetB / 001
                                    1, 1, 0, 2, 2, 1,
                                    2, 2, 1, 2, 1, 2,
                                    2, 2, 2, 0, 1, 1,
                                    2, 1, 2, 1, 2, 1,]},

{"rows": 6, "columns": 6, "board": [2, 0, 1, 0, 1, 2,     // b / 005
                                    2, 2, 2, 2, 1, 2,
                                    1, 2, 2, 1, 2, 0,
                                    1, 2, 1, 1, 2, 1,
                                    0, 2, 2, 2, 0, 2,
                                    1, 1, 1, 1, 1, 1,]},

{"rows": 6, "columns": 6, "board": [0, 2, 0, 1, 0, 0,     // b 007
                                    2, 2, 1, 2, 1, 1,
                                    1, 2, 2, 2, 2, 1,
                                    1, 2, 2, 2, 1, 1,
                                    0, 2, 2, 1, 0, 1,
                                    1, 2, 1, 2, 2, 2,]},

{"rows": 6, "columns": 6, "board": [2, 0, 0, 2, 1, 2,     // b 00 8
                                    2, 2, 1, 2, 2, 1,
                                    1, 2, 0, 0, 0, 2,
                                    1, 2, 1, 1, 2, 1,
                                    1, 2, 1, 2, 1, 1,
                                    2, 2, 2, 2, 2, 1,]},

{"rows": 10, "columns": 10, "board": [0, 2, 1, 0, 1, 0, 2, 1, 0, 0,
                                      2, 1, 0, 1, 2, 0, 1, 0, 1, 0,
                                      1, 0, 1, 1, 2, 1, 0, 2, 0, 2,
                                      0, 1, 2, 2, 1, 0, 0, 1, 1, 0,
                                      1, 2, 2, 1, 2, 0, 1, 1, 0, 0,
                                      1, 2, 1, 0, 0, 0, 1, 0, 0, 0,
                                      1, 2, 2, 1, 2, 1, 1, 1, 2, 1,
                                      0, 0, 0, 1, 0, 0, 2, 0, 0, 1,
                                      0, 1, 2, 1, 0, 1, 2, 0, 1, 0,
                                      0, 1, 0, 2, 0, 0, 1, 2, 0, 0,]},

{"rows": 8, "columns": 8, "board": [2, 1, 0, 2, 0, 1, 0, 0,
                                    1, 0, 1, 1, 0, 1, 2, 1,
                                    2, 0, 1, 2, 0, 2, 0, 1,
                                    0, 1, 2, 0, 1, 0, 2, 0,
                                    1, 2, 2, 0, 1, 2, 1, 0,
                                    1, 1, 2, 2, 0, 1, 2, 1,
                                    1, 0, 2, 1, 0, 1, 1, 0,
                                    2, 0, 1, 1, 0, 0, 0, 0,]},

];

let tutorialLevels = [
  {"rows": 3, "columns": 3, "board": [2, 0, 0,
                                      0, 1, 0,
                                      0, 0, 0]},

  {"rows": 3, "columns": 3, "board": [2, 2, 2,
                                      2, 1, 2,
                                      2, 2, 2]},

  {"rows": 3, "columns": 3, "board": [1, 2, 2,
                                      2, 2, 1,
                                      0, 2, 2]},

];