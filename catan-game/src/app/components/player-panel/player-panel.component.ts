import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService } from '../../services/game.service';
import { GameState, ResourceType, GamePhase, TradeOffer, Player } from '../../models/game.models';

@Component({
  selector: 'app-player-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-panel.component.html',
  styleUrls: ['./player-panel.component.scss']
})
export class PlayerPanelComponent {
  @Input() gameState!: GameState;

  ResourceType = ResourceType;
  GamePhase = GamePhase;

  showTradeDialog = false;
  tradeOffer = {
    offering: new Map<ResourceType, number>(),
    requesting: new Map<ResourceType, number>()
  };

  constructor(private gameService: GameService) {
    // Initialize trade maps
    Object.values(ResourceType).forEach(type => {
      this.tradeOffer.offering.set(type as ResourceType, 0);
      this.tradeOffer.requesting.set(type as ResourceType, 0);
    });
  }

  get currentPlayer() {
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  get resourceTypes() {
    return Object.values(ResourceType);
  }

  rollDice(): void {
    const result = this.gameService.rollDice();
    if (result.total > 0) {
      alert(`Rolled ${result.dice1} and ${result.dice2} = ${result.total}`);
    }
  }

  buildSettlement(): void {
    alert('Click on a vertex (circle) on the board to place a settlement');
  }

  buildCity(): void {
    alert('Click on one of your settlements to upgrade it to a city');
  }

  buildRoad(): void {
    alert('Click on an edge (line) on the board to place a road');
  }

  buyDevelopmentCard(): void {
    if (this.gameService.buyDevelopmentCard()) {
      alert('Development card purchased!');
    } else {
      alert('Cannot buy development card. Check resources or deck is empty.');
    }
  }

  openTradeDialog(): void {
    this.showTradeDialog = true;
  }

  closeTradeDialog(): void {
    this.showTradeDialog = false;
  }

  proposeTrade(): void {
    const offering = new Map<ResourceType, number>();
    const requesting = new Map<ResourceType, number>();

    this.tradeOffer.offering.forEach((amount, type) => {
      if (amount > 0) offering.set(type, amount);
    });

    this.tradeOffer.requesting.forEach((amount, type) => {
      if (amount > 0) requesting.set(type, amount);
    });

    if (offering.size === 0 || requesting.size === 0) {
      alert('Please specify resources to offer and request');
      return;
    }

    if (this.gameService.createTradeOffer(offering, requesting, null)) {
      alert('Trade offer created!');
      this.closeTradeDialog();
      // Reset trade offer
      this.tradeOffer.offering.forEach((_, key) => this.tradeOffer.offering.set(key, 0));
      this.tradeOffer.requesting.forEach((_, key) => this.tradeOffer.requesting.set(key, 0));
    } else {
      alert('Cannot create trade offer');
    }
  }

  acceptTrade(index: number): void {
    if (this.gameService.acceptTrade(index)) {
      alert('Trade accepted!');
    } else {
      alert('Cannot accept trade');
    }
  }

  endTurn(): void {
    this.gameService.endTurn();
  }

  getResourceCount(player: any, resource: ResourceType): number {
    return player.resources.get(resource) || 0;
  }

  getResourceIcon(resource: ResourceType): string {
    const icons: { [key in ResourceType]: string } = {
      [ResourceType.WOOD]: '🌲',
      [ResourceType.BRICK]: '🧱',
      [ResourceType.SHEEP]: '🐑',
      [ResourceType.WHEAT]: '🌾',
      [ResourceType.ORE]: '⛰️'
    };
    return icons[resource];
  }

  canBuySettlement(): boolean {
    return this.getResourceCount(this.currentPlayer, ResourceType.WOOD) >= 1 &&
           this.getResourceCount(this.currentPlayer, ResourceType.BRICK) >= 1 &&
           this.getResourceCount(this.currentPlayer, ResourceType.SHEEP) >= 1 &&
           this.getResourceCount(this.currentPlayer, ResourceType.WHEAT) >= 1 &&
           this.currentPlayer.settlements > 0;
  }

  canBuyCity(): boolean {
    return this.getResourceCount(this.currentPlayer, ResourceType.ORE) >= 3 &&
           this.getResourceCount(this.currentPlayer, ResourceType.WHEAT) >= 2 &&
           this.currentPlayer.cities > 0;
  }

  canBuyRoad(): boolean {
    return this.getResourceCount(this.currentPlayer, ResourceType.WOOD) >= 1 &&
           this.getResourceCount(this.currentPlayer, ResourceType.BRICK) >= 1 &&
           this.currentPlayer.roads > 0;
  }

  canBuyDevCard(): boolean {
    return this.getResourceCount(this.currentPlayer, ResourceType.ORE) >= 1 &&
           this.getResourceCount(this.currentPlayer, ResourceType.WHEAT) >= 1 &&
           this.getResourceCount(this.currentPlayer, ResourceType.SHEEP) >= 1;
  }

  getTotalResources(player: any): number {
    let total = 0;
    player.resources.forEach((count: number) => {
      total += count;
    });
    return total;
  }

  getTradeOfferValue(resource: ResourceType): number {
    return this.tradeOffer.offering.get(resource) || 0;
  }

  setTradeOfferValue(resource: ResourceType, value: number): void {
    this.tradeOffer.offering.set(resource, value);
  }

  getTradeRequestValue(resource: ResourceType): number {
    return this.tradeOffer.requesting.get(resource) || 0;
  }

  setTradeRequestValue(resource: ResourceType, value: number): void {
    this.tradeOffer.requesting.set(resource, value);
  }

  getPlayerById(playerId: number | null): Player | undefined {
    if (playerId === null) return undefined;
    return this.gameState.players.find(p => p.id === playerId);
  }

  getPlayerNameById(playerId: number | null): string {
    const player = this.getPlayerById(playerId);
    return player ? player.name : 'Unknown';
  }

  isSetupPhase(): boolean {
    return this.gameState.phase === GamePhase.SETUP_SETTLEMENT_1 ||
           this.gameState.phase === GamePhase.SETUP_SETTLEMENT_2 ||
           this.gameState.phase === GamePhase.SETUP_ROAD_1 ||
           this.gameState.phase === GamePhase.SETUP_ROAD_2;
  }
}
