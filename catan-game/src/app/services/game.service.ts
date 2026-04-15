import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  GameState, Player, HexTile, Vertex, Edge, ResourceType, TerrainType,
  DevelopmentCard, DevelopmentCardType, BuildingType, GamePhase,
  Building, Road, TradeOffer
} from '../models/game.models';

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private gameState$ = new BehaviorSubject<GameState | null>(null);
  private readonly VICTORY_POINTS_TO_WIN = 10;

  constructor() { }

  getGameState(): Observable<GameState | null> {
    return this.gameState$.asObservable();
  }

  initializeGame(playerNames: string[]): void {
    if (playerNames.length < 2 || playerNames.length > 6) {
      throw new Error('Game requires 2-6 players');
    }

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const players: Player[] = playerNames.map((name, index) => ({
      id: index,
      name,
      color: colors[index],
      resources: new Map([
        [ResourceType.WOOD, 0],
        [ResourceType.BRICK, 0],
        [ResourceType.SHEEP, 0],
        [ResourceType.WHEAT, 0],
        [ResourceType.ORE, 0]
      ]),
      developmentCards: [],
      settlements: 5,
      cities: 4,
      roads: 15,
      knightsPlayed: 0,
      victoryPoints: 0,
      longestRoad: false,
      largestArmy: false
    }));

    const hexTiles = this.createHexBoard();
    const { vertices, edges } = this.createVerticesAndEdges(hexTiles);
    const developmentCardDeck = this.createDevelopmentCardDeck();

    const initialState: GameState = {
      players,
      currentPlayerIndex: 0,
      hexTiles,
      vertices,
      edges,
      developmentCardDeck,
      phase: GamePhase.SETUP_SETTLEMENT_1,
      diceRoll: null,
      longestRoadPlayerId: null,
      largestArmyPlayerId: null,
      winner: null,
      tradeOffers: []
    };

    this.gameState$.next(initialState);
  }

  private createHexBoard(): HexTile[] {
    // Standard Catan board layout (19 hexes)
    const terrainDistribution = [
      TerrainType.FOREST, TerrainType.FOREST, TerrainType.FOREST, TerrainType.FOREST,
      TerrainType.HILLS, TerrainType.HILLS, TerrainType.HILLS,
      TerrainType.PASTURE, TerrainType.PASTURE, TerrainType.PASTURE, TerrainType.PASTURE,
      TerrainType.FIELDS, TerrainType.FIELDS, TerrainType.FIELDS, TerrainType.FIELDS,
      TerrainType.MOUNTAINS, TerrainType.MOUNTAINS, TerrainType.MOUNTAINS,
      TerrainType.DESERT
    ];

    const numberDistribution = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

    // Shuffle terrains
    this.shuffleArray(terrainDistribution);
    this.shuffleArray(numberDistribution);

    const hexes: HexTile[] = [];
    let hexId = 0;
    let numberIndex = 0;

    // Create hex grid (3 rows of 3, 4, 5, 4, 3)
    const rows = [3, 4, 5, 4, 3];
    rows.forEach((count, rowIndex) => {
      for (let col = 0; col < count; col++) {
        const terrain = terrainDistribution[hexId];
        const isDesert = terrain === TerrainType.DESERT;

        hexes.push({
          id: hexId,
          terrain,
          number: isDesert ? null : numberDistribution[numberIndex++],
          hasRobber: isDesert,
          row: rowIndex,
          col
        });
        hexId++;
      }
    });

    return hexes;
  }

  private createVerticesAndEdges(hexTiles: HexTile[]): { vertices: Vertex[], edges: Edge[] } {
    const vertices: Vertex[] = [];
    const edges: Edge[] = [];

    // For simplicity, create a fixed number of vertices and edges
    // In a real implementation, these would be calculated based on hex positions
    for (let i = 0; i < 54; i++) {
      vertices.push({
        id: i,
        building: null,
        adjacentHexes: [],
        adjacentVertices: [],
        adjacentEdges: []
      });
    }

    for (let i = 0; i < 72; i++) {
      edges.push({
        id: i,
        road: null,
        adjacentVertices: [],
        adjacentHexes: []
      });
    }

    return { vertices, edges };
  }

  private createDevelopmentCardDeck(): DevelopmentCard[] {
    const deck: DevelopmentCard[] = [];

    // Add knights (14)
    for (let i = 0; i < 14; i++) {
      deck.push({ type: DevelopmentCardType.KNIGHT, played: false });
    }

    // Add victory points (5)
    for (let i = 0; i < 5; i++) {
      deck.push({ type: DevelopmentCardType.VICTORY_POINT, played: false });
    }

    // Add road building (2)
    for (let i = 0; i < 2; i++) {
      deck.push({ type: DevelopmentCardType.ROAD_BUILDING, played: false });
    }

    // Add year of plenty (2)
    for (let i = 0; i < 2; i++) {
      deck.push({ type: DevelopmentCardType.YEAR_OF_PLENTY, played: false });
    }

    // Add monopoly (2)
    for (let i = 0; i < 2; i++) {
      deck.push({ type: DevelopmentCardType.MONOPOLY, played: false });
    }

    this.shuffleArray(deck);
    return deck;
  }

  rollDice(): { dice1: number, dice2: number, total: number } {
    const state = this.gameState$.value;
    if (!state || state.phase !== GamePhase.ROLL_DICE) return { dice1: 0, dice2: 0, total: 0 };

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const total = dice1 + dice2;

    state.diceRoll = total;

    if (total === 7) {
      // Move to robber phase
      state.phase = GamePhase.PLACE_ROBBER;
      this.handleSevenRolled(state);
    } else {
      // Distribute resources
      this.distributeResources(state, total);
      state.phase = GamePhase.MAIN;
    }

    this.gameState$.next(state);
    return { dice1, dice2, total };
  }

  private handleSevenRolled(state: GameState): void {
    // Players with more than 7 cards must discard half
    state.players.forEach(player => {
      const totalCards = Array.from(player.resources.values()).reduce((sum, count) => sum + count, 0);
      if (totalCards > 7) {
        const toDiscard = Math.floor(totalCards / 2);
        // In a real game, this would prompt the player to select cards
        // For now, we'll randomly discard
        this.discardRandomResources(player, toDiscard);
      }
    });
  }

  private discardRandomResources(player: Player, count: number): void {
    for (let i = 0; i < count; i++) {
      const resourceTypes = Array.from(player.resources.keys()).filter(
        type => player.resources.get(type)! > 0
      );
      if (resourceTypes.length > 0) {
        const randomType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        player.resources.set(randomType, player.resources.get(randomType)! - 1);
      }
    }
  }

  private distributeResources(state: GameState, diceRoll: number): void {
    // Find all hexes with the rolled number
    const matchingHexes = state.hexTiles.filter(hex => hex.number === diceRoll && !hex.hasRobber);

    matchingHexes.forEach(hex => {
      // Find all vertices adjacent to this hex
      const adjacentVertices = state.vertices.filter(v => v.adjacentHexes.includes(hex.id));

      adjacentVertices.forEach(vertex => {
        if (vertex.building) {
          const player = state.players.find(p => p.id === vertex.building!.playerId);
          if (player) {
            const resource = this.getResourceFromTerrain(hex.terrain);
            if (resource) {
              const multiplier = vertex.building.type === BuildingType.CITY ? 2 : 1;
              const currentAmount = player.resources.get(resource) || 0;
              player.resources.set(resource, currentAmount + multiplier);
            }
          }
        }
      });
    });
  }

  private getResourceFromTerrain(terrain: TerrainType): ResourceType | null {
    const mapping: { [key in TerrainType]?: ResourceType } = {
      [TerrainType.FOREST]: ResourceType.WOOD,
      [TerrainType.HILLS]: ResourceType.BRICK,
      [TerrainType.PASTURE]: ResourceType.SHEEP,
      [TerrainType.FIELDS]: ResourceType.WHEAT,
      [TerrainType.MOUNTAINS]: ResourceType.ORE
    };
    return mapping[terrain] || null;
  }

  buildSettlement(vertexId: number): boolean {
    const state = this.gameState$.value;
    if (!state) return false;

    const currentPlayer = state.players[state.currentPlayerIndex];
    const vertex = state.vertices.find(v => v.id === vertexId);

    if (!vertex || vertex.building) return false;

    // Check if adjacent vertices have buildings (distance rule)
    const hasAdjacentBuildings = vertex.adjacentVertices.some(adjId => {
      const adjVertex = state.vertices.find(v => v.id === adjId);
      return adjVertex?.building !== null;
    });

    if (hasAdjacentBuildings) return false;

    // In setup phase, no resource cost
    if (state.phase === GamePhase.SETUP_SETTLEMENT_1 || state.phase === GamePhase.SETUP_SETTLEMENT_2) {
      if (currentPlayer.settlements <= 0) return false;

      vertex.building = {
        type: BuildingType.SETTLEMENT,
        playerId: currentPlayer.id
      };

      currentPlayer.settlements--;
      currentPlayer.victoryPoints++;

      // Move to next phase
      if (state.phase === GamePhase.SETUP_SETTLEMENT_1) {
        state.phase = GamePhase.SETUP_ROAD_1;
      } else {
        // In second setup, give resources from adjacent hexes
        vertex.adjacentHexes.forEach(hexId => {
          const hex = state.hexTiles.find(h => h.id === hexId);
          if (hex && hex.terrain !== TerrainType.DESERT) {
            const resource = this.getResourceFromTerrain(hex.terrain);
            if (resource) {
              currentPlayer.resources.set(resource, currentPlayer.resources.get(resource)! + 1);
            }
          }
        });
        state.phase = GamePhase.SETUP_ROAD_2;
      }
    } else {
      // Normal game phase - check resources
      if (!this.hasResources(currentPlayer, [
        ResourceType.WOOD, ResourceType.BRICK, ResourceType.SHEEP, ResourceType.WHEAT
      ])) return false;

      if (currentPlayer.settlements <= 0) return false;

      // Deduct resources
      this.deductResources(currentPlayer, [
        ResourceType.WOOD, ResourceType.BRICK, ResourceType.SHEEP, ResourceType.WHEAT
      ]);

      vertex.building = {
        type: BuildingType.SETTLEMENT,
        playerId: currentPlayer.id
      };

      currentPlayer.settlements--;
      currentPlayer.victoryPoints++;
    }

    this.checkVictory(state);
    this.gameState$.next(state);
    return true;
  }

  buildCity(vertexId: number): boolean {
    const state = this.gameState$.value;
    if (!state || state.phase !== GamePhase.MAIN) return false;

    const currentPlayer = state.players[state.currentPlayerIndex];
    const vertex = state.vertices.find(v => v.id === vertexId);

    if (!vertex || !vertex.building || vertex.building.type !== BuildingType.SETTLEMENT) return false;
    if (vertex.building.playerId !== currentPlayer.id) return false;

    // Check resources (3 ore, 2 wheat)
    if (currentPlayer.resources.get(ResourceType.ORE)! < 3 ||
        currentPlayer.resources.get(ResourceType.WHEAT)! < 2) return false;

    if (currentPlayer.cities <= 0) return false;

    // Deduct resources
    currentPlayer.resources.set(ResourceType.ORE, currentPlayer.resources.get(ResourceType.ORE)! - 3);
    currentPlayer.resources.set(ResourceType.WHEAT, currentPlayer.resources.get(ResourceType.WHEAT)! - 2);

    // Upgrade to city
    vertex.building.type = BuildingType.CITY;
    currentPlayer.cities--;
    currentPlayer.settlements++; // Return settlement to player
    currentPlayer.victoryPoints++; // City gives 1 additional VP

    this.checkVictory(state);
    this.gameState$.next(state);
    return true;
  }

  buildRoad(edgeId: number): boolean {
    const state = this.gameState$.value;
    if (!state) return false;

    const currentPlayer = state.players[state.currentPlayerIndex];
    const edge = state.edges.find(e => e.id === edgeId);

    if (!edge || edge.road) return false;

    // In setup phase
    if (state.phase === GamePhase.SETUP_ROAD_1 || state.phase === GamePhase.SETUP_ROAD_2) {
      if (currentPlayer.roads <= 0) return false;

      edge.road = { playerId: currentPlayer.id };
      currentPlayer.roads--;

      // Move to next phase or next player
      this.advanceSetupPhase(state);
    } else {
      // Normal game phase - check resources
      if (!this.hasResources(currentPlayer, [ResourceType.WOOD, ResourceType.BRICK])) return false;

      if (currentPlayer.roads <= 0) return false;

      // Deduct resources
      this.deductResources(currentPlayer, [ResourceType.WOOD, ResourceType.BRICK]);

      edge.road = { playerId: currentPlayer.id };
      currentPlayer.roads--;

      // Update longest road
      this.updateLongestRoad(state);
    }

    this.gameState$.next(state);
    return true;
  }

  buyDevelopmentCard(): boolean {
    const state = this.gameState$.value;
    if (!state || state.phase !== GamePhase.MAIN) return false;

    const currentPlayer = state.players[state.currentPlayerIndex];

    // Check resources (1 ore, 1 wheat, 1 sheep)
    if (currentPlayer.resources.get(ResourceType.ORE)! < 1 ||
        currentPlayer.resources.get(ResourceType.WHEAT)! < 1 ||
        currentPlayer.resources.get(ResourceType.SHEEP)! < 1) return false;

    if (state.developmentCardDeck.length === 0) return false;

    // Deduct resources
    currentPlayer.resources.set(ResourceType.ORE, currentPlayer.resources.get(ResourceType.ORE)! - 1);
    currentPlayer.resources.set(ResourceType.WHEAT, currentPlayer.resources.get(ResourceType.WHEAT)! - 1);
    currentPlayer.resources.set(ResourceType.SHEEP, currentPlayer.resources.get(ResourceType.SHEEP)! - 1);

    // Draw card
    const card = state.developmentCardDeck.pop()!;
    currentPlayer.developmentCards.push(card);

    if (card.type === DevelopmentCardType.VICTORY_POINT) {
      currentPlayer.victoryPoints++;
      this.checkVictory(state);
    }

    this.gameState$.next(state);
    return true;
  }

  createTradeOffer(offeredResources: Map<ResourceType, number>, requestedResources: Map<ResourceType, number>, targetPlayerId: number | null): boolean {
    const state = this.gameState$.value;
    if (!state || state.phase !== GamePhase.MAIN) return false;

    const currentPlayer = state.players[state.currentPlayerIndex];

    // Validate player has offered resources
    for (const [resource, amount] of offeredResources) {
      if (currentPlayer.resources.get(resource)! < amount) return false;
    }

    const tradeOffer: TradeOffer = {
      offeringPlayerId: currentPlayer.id,
      targetPlayerId,
      offeredResources,
      requestedResources,
      status: 'pending'
    };

    state.tradeOffers.push(tradeOffer);
    this.gameState$.next(state);
    return true;
  }

  acceptTrade(tradeIndex: number): boolean {
    const state = this.gameState$.value;
    if (!state) return false;

    const trade = state.tradeOffers[tradeIndex];
    if (!trade || trade.status !== 'pending') return false;

    const offeringPlayer = state.players.find(p => p.id === trade.offeringPlayerId);
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (!offeringPlayer || !currentPlayer) return false;

    // Validate both players have resources
    for (const [resource, amount] of trade.offeredResources) {
      if (offeringPlayer.resources.get(resource)! < amount) return false;
    }
    for (const [resource, amount] of trade.requestedResources) {
      if (currentPlayer.resources.get(resource)! < amount) return false;
    }

    // Execute trade
    for (const [resource, amount] of trade.offeredResources) {
      offeringPlayer.resources.set(resource, offeringPlayer.resources.get(resource)! - amount);
      currentPlayer.resources.set(resource, currentPlayer.resources.get(resource)! + amount);
    }
    for (const [resource, amount] of trade.requestedResources) {
      currentPlayer.resources.set(resource, currentPlayer.resources.get(resource)! - amount);
      offeringPlayer.resources.set(resource, offeringPlayer.resources.get(resource)! + amount);
    }

    trade.status = 'accepted';
    this.gameState$.next(state);
    return true;
  }

  endTurn(): void {
    const state = this.gameState$.value;
    if (!state) return;

    // Clear trade offers
    state.tradeOffers = [];

    // Move to next player
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    state.phase = GamePhase.ROLL_DICE;
    state.diceRoll = null;

    this.gameState$.next(state);
  }

  private advanceSetupPhase(state: GameState): void {
    if (state.phase === GamePhase.SETUP_ROAD_1) {
      if (state.currentPlayerIndex === state.players.length - 1) {
        state.phase = GamePhase.SETUP_SETTLEMENT_2;
      } else {
        state.currentPlayerIndex++;
        state.phase = GamePhase.SETUP_SETTLEMENT_1;
      }
    } else if (state.phase === GamePhase.SETUP_ROAD_2) {
      if (state.currentPlayerIndex === 0) {
        state.phase = GamePhase.ROLL_DICE;
      } else {
        state.currentPlayerIndex--;
        state.phase = GamePhase.SETUP_SETTLEMENT_2;
      }
    }
  }

  private hasResources(player: Player, resources: ResourceType[]): boolean {
    return resources.every(resource => player.resources.get(resource)! > 0);
  }

  private deductResources(player: Player, resources: ResourceType[]): void {
    resources.forEach(resource => {
      player.resources.set(resource, player.resources.get(resource)! - 1);
    });
  }

  private updateLongestRoad(state: GameState): void {
    // Simplified longest road calculation
    // In a complete implementation, this would traverse the road network
    let maxRoadLength = 4; // Minimum for longest road
    let longestRoadPlayerId: number | null = null;

    state.players.forEach(player => {
      const roadLength = this.calculateRoadLength(state, player.id);
      if (roadLength > maxRoadLength) {
        maxRoadLength = roadLength;
        longestRoadPlayerId = player.id;
      }
    });

    // Update longest road
    if (longestRoadPlayerId !== state.longestRoadPlayerId) {
      if (state.longestRoadPlayerId !== null) {
        const oldPlayer = state.players.find(p => p.id === state.longestRoadPlayerId);
        if (oldPlayer) {
          oldPlayer.longestRoad = false;
          oldPlayer.victoryPoints -= 2;
        }
      }

      if (longestRoadPlayerId !== null) {
        const newPlayer = state.players.find(p => p.id === longestRoadPlayerId);
        if (newPlayer) {
          newPlayer.longestRoad = true;
          newPlayer.victoryPoints += 2;
        }
      }

      state.longestRoadPlayerId = longestRoadPlayerId;
    }
  }

  private calculateRoadLength(state: GameState, playerId: number): number {
    // Simplified calculation - returns number of roads
    // A complete implementation would find the longest continuous path
    return state.edges.filter(e => e.road?.playerId === playerId).length;
  }

  private checkVictory(state: GameState): void {
    const winner = state.players.find(p => p.victoryPoints >= this.VICTORY_POINTS_TO_WIN);
    if (winner) {
      state.winner = winner.id;
      state.phase = GamePhase.GAME_OVER;
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
