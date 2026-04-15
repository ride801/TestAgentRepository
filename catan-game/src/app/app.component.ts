import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from './services/game.service';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { PlayerPanelComponent } from './components/player-panel/player-panel.component';
import { SetupComponent } from './components/setup/setup.component';
import { GameState } from './models/game.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameBoardComponent,
    PlayerPanelComponent,
    SetupComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  gameState: GameState | null = null;
  gameStarted = false;

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.gameService.getGameState().subscribe(state => {
      this.gameState = state;
      this.gameStarted = state !== null;
    });
  }

  onGameStart(playerNames: string[]): void {
    this.gameService.initializeGame(playerNames);
  }
}
