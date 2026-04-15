import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Player {
  id: number;
  name: string;
}

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss']
})
export class SetupComponent {
  @Output() gameStart = new EventEmitter<string[]>();

  playerCount = 4;
  private nextPlayerId = 5;
  players: Player[] = [
    { id: 1, name: 'Player 1' },
    { id: 2, name: 'Player 2' },
    { id: 3, name: 'Player 3' },
    { id: 4, name: 'Player 4' }
  ];

  onPlayerCountChange(): void {
    if (this.playerCount < 2) this.playerCount = 2;
    if (this.playerCount > 6) this.playerCount = 6;

    // Adjust players array without modifying existing elements
    while (this.players.length < this.playerCount) {
      this.players.push({ 
        id: this.nextPlayerId++, 
        name: `Player ${this.players.length + 1}` 
      });
    }
    while (this.players.length > this.playerCount) {
      this.players.pop();
    }
  }

  startGame(): void {
    const validNames = this.players
      .map(p => p.name)
      .filter(name => name.trim() !== '');
    if (validNames.length === this.playerCount) {
      this.gameStart.emit(validNames);
    }
  }

  trackByPlayerId(index: number, player: Player): number {
    return player.id;
  }
}
