import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent implements OnInit {

  squares: any[] = [];
  bombSquares: any[] = [];
  hintColors: any[] = [];
  width = 5;
  height = 5;
  totalSquares = 25;
  numberOfMines = 8;
  complete = false;

  constructor() { }

  ngOnInit(w:number=5, h:number=5): void {
    this.width = w;
    this.height = h;
    this.totalSquares = this.width * this.height;
    this.numberOfMines = Math.ceil(this.totalSquares / 3);
    this.newGame();
    let main = document.getElementById("game-board");
    main?.setAttribute("style", "--columns: " + this.width + ";");
  }

  newGame() {
    this.squares = Array(this.totalSquares).fill(null);
    this.bombSquares = Array(this.totalSquares).fill(null);
    this.hintColors = Array(this.totalSquares).fill("black");
    for (let i=0; i<this.numberOfMines; i++) {
      this.addHint();
      this.addBomb();
    }
    this.updateBombs();
    this.updateHints();
  }

  makeMove(idx: number) {
    if (this.squares[idx] == null) {
      this.squares.splice(idx, 1, 'B');
    }
    else if (this.squares[idx] == 'B') {
      this.squares.splice(idx, 1, 'X');
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

  addBomb() {
    this.squares.splice(this.randomEmptySquareIndex(), 1, 'B');
  }

  addHint() {
    this.squares.splice(this.randomEmptySquareIndex(), 1, 0);
  }

  updateBombs() {
    for (let i=0; i<this.squares.length; i++) {
      if (this.squares[i] == 'B') {
        this.bombSquares.splice(i, 1, 'B');
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
          if (this.bombSquares[adjacentSquareIndexes[b]] == 'B') mines++; // Adjacent mine
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
  }

}

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
