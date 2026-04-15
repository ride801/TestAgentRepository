import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from './services/game.service';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { PlayerPanelComponent } from './components/player-panel/player-panel.component';
import { SetupComponent } from './components/setup/setup.component';
import { GameState, GamePhase } from './models/game.models';

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

  getPhaseText(state: GameState): string {
    const phaseTexts: { [key in GamePhase]: string } = {
      [GamePhase.SETUP_SETTLEMENT_1]: 'Setup - Place Settlement',
      [GamePhase.SETUP_ROAD_1]: 'Setup - Place Road',
      [GamePhase.SETUP_SETTLEMENT_2]: 'Setup Round 2 - Place Settlement',
      [GamePhase.SETUP_ROAD_2]: 'Setup Round 2 - Place Road',
      [GamePhase.ROLL_DICE]: 'Roll Dice',
      [GamePhase.PLACE_ROBBER]: 'Place the Robber',
      [GamePhase.MAIN]: 'Main Phase - Build or Trade',
      [GamePhase.GAME_OVER]: state.winner === null ? 'Game Over' : `Game Over! Winner: ${state.players.find(p => p.id === state.winner)?.name}`
    };
    return phaseTexts[state.phase];
  }
}
