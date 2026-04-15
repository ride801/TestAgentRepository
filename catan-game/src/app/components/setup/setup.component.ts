import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Player {
  id: number;
  name: string;
  color: string;
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
  private readonly playerColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
  
  players: Player[] = [
    { id: 1, name: 'Player 1', color: this.playerColors[0] },
    { id: 2, name: 'Player 2', color: this.playerColors[1] },
    { id: 3, name: 'Player 3', color: this.playerColors[2] },
    { id: 4, name: 'Player 4', color: this.playerColors[3] }
  ];

  onPlayerCountChange(): void {
    if (this.playerCount < 2) this.playerCount = 2;
    if (this.playerCount > 6) this.playerCount = 6;

    // Adjust players array without modifying existing elements
    while (this.players.length < this.playerCount) {
      const index = this.players.length;
      this.players.push({ 
        id: this.nextPlayerId++, 
        name: `Player ${index + 1}`,
        color: this.playerColors[index % this.playerColors.length]
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
