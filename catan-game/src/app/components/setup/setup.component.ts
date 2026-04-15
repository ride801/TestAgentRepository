import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  playerNames: string[] = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

  onPlayerCountChange(): void {
    if (this.playerCount < 2) this.playerCount = 2;
    if (this.playerCount > 6) this.playerCount = 6;

    // Adjust player names array
    while (this.playerNames.length < this.playerCount) {
      this.playerNames.push(`Player ${this.playerNames.length + 1}`);
    }
    while (this.playerNames.length > this.playerCount) {
      this.playerNames.pop();
    }
  }

  startGame(): void {
    const validNames = this.playerNames.filter(name => name.trim() !== '');
    if (validNames.length === this.playerCount) {
      this.gameStart.emit(validNames);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}
