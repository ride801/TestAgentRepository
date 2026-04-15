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

  // Create enough vertices to cover all hex vertices (19 hexes * 6 vertices = 114)
  // Using a larger number to ensure all calculated IDs are valid
  for (let i = 0; i < 120; i++) {
    vertices.push({
      id: i,
      building: null,
      adjacentHexes: [],
      adjacentVertices: [],
      adjacentEdges: []
    });
  }

  // Create enough edges to cover all hex edges (19 hexes * 6 edges = 114)
  for (let i = 0; i < 120; i++) {
    edges.push({
      id: i,
      road: null,
      adjacentVertices: [],
      adjacentHexes: []
    });
  }

  // Populate vertex-hex relationships
  // Each hex has 6 vertices, vertex ID = hex.id * 6 + vertexIndex
  hexTiles.forEach(hex => {
    for (let i = 0; i < 6; i++) {
      const vertexId = hex.id * 6 + i;
      if (vertices[vertexId]) {
        vertices[vertexId].adjacentHexes.push(hex.id);
        
        // Each vertex connects to the next and previous vertices on the same hex
        const prevVertex = hex.id * 6 + ((i - 1 + 6) % 6);
        const nextVertex = hex.id * 6 + ((i + 1) % 6);
        
        if (!vertices[vertexId].adjacentVertices.includes(prevVertex)) {
          vertices[vertexId].adjacentVertices.push(prevVertex);
        }
        if (!vertices[vertexId].adjacentVertices.includes(nextVertex)) {
          vertices[vertexId].adjacentVertices.push(nextVertex);
        }
      }
    }
  });

  // Get hex neighbors and update vertex-hex relationships for shared vertices
  const hexNeighbors = this.getHexNeighbors();
  
  hexTiles.forEach(hex => {
    const neighbors = hexNeighbors[hex.id] || [];
    
    neighbors.forEach(neighborInfo => {
      const neighborHex = hexTiles.find(h => h.id === neighborInfo.hexId);
      if (neighborHex) {
        // Vertices are shared between adjacent hexes
        // For each shared edge between hex and neighbor, the two vertices of that edge are shared
        const sharedVertices = this.getSharedVertices(hex.id, neighborHex.id, neighborInfo.direction);
        
        sharedVertices.forEach(vertexPair => {
          const v1 = vertices[vertexPair.v1];
          const v2 = vertices[vertexPair.v2];
          
          if (v1 && v2) {
            // Both vertices represent the same physical location
            // Add neighbor hex to both vertices' adjacentHexes if not already there
            if (!v1.adjacentHexes.includes(neighborHex.id)) {
              v1.adjacentHexes.push(neighborHex.id);
            }
            if (!v2.adjacentHexes.includes(hex.id)) {
              v2.adjacentHexes.push(hex.id);
            }
          }
        });
      }
    });
  });

  return { vertices, edges };
}

private getHexNeighbors(): { [hexId: number]: Array<{ hexId: number, direction: number }> } {
  // Standard Catan board neighbor relationships
  // Direction: 0=top-right, 1=right, 2=bottom-right, 3=bottom-left, 4=left, 5=top-left
  return {
    0: [{ hexId: 1, direction: 1 }, { hexId: 3, direction: 2 }, { hexId: 4, direction: 3 }],
    1: [{ hexId: 0, direction: 4 }, { hexId: 2, direction: 1 }, { hexId: 4, direction: 3 }, { hexId: 5, direction: 2 }],
    2: [{ hexId: 1, direction: 4 }, { hexId: 5, direction: 3 }, { hexId: 6, direction: 2 }],
    3: [{ hexId: 0, direction: 5 }, { hexId: 4, direction: 1 }, { hexId: 7, direction: 2 }, { hexId: 8, direction: 3 }],
    4: [{ hexId: 0, direction: 0 }, { hexId: 1, direction: 5 }, { hexId: 3, direction: 4 }, { hexId: 5, direction: 1 }, { hexId: 8, direction: 3 }, { hexId: 9, direction: 2 }],
    5: [{ hexId: 1, direction: 0 }, { hexId: 2, direction: 5 }, { hexId: 4, direction: 4 }, { hexId: 6, direction: 1 }, { hexId: 9, direction: 3 }, { hexId: 10, direction: 2 }],
    6: [{ hexId: 2, direction: 0 }, { hexId: 5, direction: 4 }, { hexId: 10, direction: 3 }, { hexId: 11, direction: 2 }],
    7: [{ hexId: 3, direction: 0 }, { hexId: 8, direction: 1 }, { hexId: 12, direction: 2 }],
    8: [{ hexId: 3, direction: 0 }, { hexId: 4, direction: 0 }, { hexId: 7, direction: 4 }, { hexId: 9, direction: 1 }, { hexId: 12, direction: 3 }, { hexId: 13, direction: 2 }],
    9: [{ hexId: 4, direction: 0 }, { hexId: 5, direction: 0 }, { hexId: 8, direction: 4 }, { hexId: 10, direction: 1 }, { hexId: 13, direction: 3 }, { hexId: 14, direction: 2 }],
    10: [{ hexId: 5, direction: 0 }, { hexId: 6, direction: 0 }, { hexId: 9, direction: 4 }, { hexId: 11, direction: 1 }, { hexId: 14, direction: 3 }, { hexId: 15, direction: 2 }],
    11: [{ hexId: 6, direction: 0 }, { hexId: 10, direction: 4 }, { hexId: 15, direction: 3 }],
    12: [{ hexId: 7, direction: 0 }, { hexId: 8, direction: 0 }, { hexId: 13, direction: 1 }, { hexId: 16, direction: 2 }],
    13: [{ hexId: 8, direction: 0 }, { hexId: 9, direction: 0 }, { hexId: 12, direction: 4 }, { hexId: 14, direction: 1 }, { hexId: 16, direction: 3 }, { hexId: 17, direction: 2 }],
    14: [{ hexId: 9, direction: 0 }, { hexId: 10, direction: 0 }, { hexId: 13, direction: 4 }, { hexId: 15, direction: 1 }, { hexId: 17, direction: 3 }, { hexId: 18, direction: 2 }],
    15: [{ hexId: 10, direction: 0 }, { hexId: 11, direction: 0 }, { hexId: 14, direction: 4 }, { hexId: 18, direction: 3 }],
    16: [{ hexId: 12, direction: 0 }, { hexId: 13, direction: 0 }, { hexId: 17, direction: 1 }],
    17: [{ hexId: 13, direction: 0 }, { hexId: 14, direction: 0 }, { hexId: 16, direction: 4 }, { hexId: 18, direction: 1 }],
    18: [{ hexId: 14, direction: 0 }, { hexId: 15, direction: 0 }, { hexId: 17, direction: 4 }]
  };
}

private getSharedVertices(hexId1: number, hexId2: number, direction: number): Array<{ v1: number, v2: number }> {
  // Returns pairs of vertex IDs that represent the same physical location
  // v1 is from hexId1, v2 is from hexId2
  // Direction is from hexId1's perspective
  
  // Hexagon vertices are numbered 0-5 clockwise from top
  // When two hexes share an edge, two vertices are shared
  // Direction 0 (top-right): vertices 0,1 of hex1 = vertices 3,4 of hex2
  // Direction 1 (right): vertices 1,2 of hex1 = vertices 4,5 of hex2
  // Direction 2 (bottom-right): vertices 2,3 of hex1 = vertices 5,0 of hex2
  // Direction 3 (bottom-left): vertices 3,4 of hex1 = vertices 0,1 of hex2
  // Direction 4 (left): vertices 4,5 of hex1 = vertices 1,2 of hex2
  // Direction 5 (top-left): vertices 5,0 of hex1 = vertices 2,3 of hex2
  
  const mappings = [
    [{ v1: 0, v2: 3 }, { v1: 1, v2: 4 }], // direction 0
    [{ v1: 1, v2: 4 }, { v1: 2, v2: 5 }], // direction 1
    [{ v1: 2, v2: 5 }, { v1: 3, v2: 0 }], // direction 2
    [{ v1: 3, v2: 0 }, { v1: 4, v2: 1 }], // direction 3
    [{ v1: 4, v2: 1 }, { v1: 5, v2: 2 }], // direction 4
    [{ v1: 5, v2: 2 }, { v1: 0, v2: 3 }]  // direction 5
  ];
  
  const pairs = mappings[direction];
  return pairs.map(p => ({
    v1: hexId1 * 6 + p.v1,
    v2: hexId2 * 6 + p.v2
  }));
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
    // Note: Phase is already set to PLACE_ROBBER in rollDice() method
    console.log('Seven rolled! Current player must move the robber.');
  }

  placeRobber(hexId: number): boolean {
    const state = this.gameState$.value;
    if (!state || state.phase !== GamePhase.PLACE_ROBBER) return false;

    const targetHex = state.hexTiles.find(h => h.id === hexId);
    if (!targetHex) return false;

    // Can't place robber on current robber location
    if (targetHex.hasRobber) {
      console.log('Robber is already on this hex!');
      return false;
    }

    // Remove robber from current location
    const currentRobberHex = state.hexTiles.find(h => h.hasRobber);
    if (currentRobberHex) {
      currentRobberHex.hasRobber = false;
    }

    // Place robber on new hex
    targetHex.hasRobber = true;
    console.log(`Robber moved to ${targetHex.terrain} hex (${targetHex.number})`);

    // TODO: Allow player to steal a resource from an opponent with a building on this hex
    // For now, just advance to main phase
    state.phase = GamePhase.MAIN;

    this.gameState$.next(state);
    return true;
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

    // Track which buildings have already received resources (globally, not per hex)
    // Key: "playerId_buildingType_locationKey"
    const processedBuildings = new Set<string>();

    matchingHexes.forEach(hex => {
      console.log(`Processing hex ${hex.id}: ${hex.terrain}, number ${hex.number}`);
      
      // Find all vertices adjacent to this hex
      const adjacentVertices = state.vertices.filter(v => v.adjacentHexes.includes(hex.id));

      adjacentVertices.forEach(vertex => {
        if (vertex.building) {
          // Create a unique key for this building location
          const locationKey = this.getBuildingLocationKey(state, vertex.id);
          const buildingKey = `${vertex.building.playerId}_${vertex.building.type}_${locationKey}`;
          
          // Only process if we haven't already awarded resources for this building
          if (!processedBuildings.has(buildingKey)) {
            processedBuildings.add(buildingKey);
            
            const player = state.players.find(p => p.id === vertex.building!.playerId);
            if (player) {
              // Get ALL hexes this building touches by checking equivalent vertices
              const allAdjacentHexes = this.getAllAdjacentHexes(state, vertex.id);
              
              // Award resources from ALL matching hexes this building touches
              allAdjacentHexes.forEach(hexId => {
                const adjacentHex = state.hexTiles.find(h => h.id === hexId);
                if (adjacentHex && adjacentHex.number === diceRoll && !adjacentHex.hasRobber) {
                  const resource = this.getResourceFromTerrain(adjacentHex.terrain);
                  if (resource) {
                    const multiplier = vertex.building!.type === BuildingType.CITY ? 2 : 1;
                    const currentAmount = player.resources.get(resource) || 0;
                    player.resources.set(resource, currentAmount + multiplier);
                    console.log(`Player ${player.name} received ${multiplier} ${resource} from hex ${adjacentHex.id} (${adjacentHex.terrain}, ${adjacentHex.number})`);
                  }
                }
              });
            }
          }
        }
      });
    });
  }

  private getAllAdjacentHexes(state: GameState, vertexId: number): number[] {
    // Find all vertices at the same physical location and collect all their hex IDs
    const vertex = state.vertices.find(v => v.id === vertexId);
    if (!vertex) return [];

    const allHexes = new Set<number>();
    
    // Add hexes from this vertex
    vertex.adjacentHexes.forEach(hexId => allHexes.add(hexId));

    // Find all equivalent vertices (same physical location) and add their hexes
    state.vertices.forEach(v => {
      if (v.id !== vertexId) {
        const sharedCount = v.adjacentHexes.filter(hexId => vertex.adjacentHexes.includes(hexId)).length;
        if (sharedCount >= 1) {
          // This vertex might be at the same location - add its hexes
          v.adjacentHexes.forEach(hexId => allHexes.add(hexId));
        }
      }
    });

    return Array.from(allHexes);
  }

  private getBuildingLocationKey(state: GameState, vertexId: number): string {
    // Find all vertices that represent the same physical location as this vertex
    // (vertices that share 2+ hexes with this vertex)
    const vertex = state.vertices.find(v => v.id === vertexId);
    if (!vertex) return vertexId.toString();

    const equivalentVertices = state.vertices
      .filter(v => {
        if (v.id === vertexId) return true;
        const sharedCount = v.adjacentHexes.filter(hexId => vertex.adjacentHexes.includes(hexId)).length;
        return sharedCount >= 2;
      })
      .map(v => v.id)
      .sort((a, b) => a - b);

    // Use the minimum vertex ID as the canonical identifier for this physical location
    return equivalentVertices[0].toString();
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

  console.log(`buildSettlement called - vertexId: ${vertexId}, phase: ${state.phase}, player: ${state.currentPlayerIndex}`);

  const currentPlayer = state.players[state.currentPlayerIndex];
  const vertex = state.vertices.find(v => v.id === vertexId);

  if (!vertex || vertex.building) {
    console.log(`Cannot build settlement - vertex not found or already has building`);
    return false;
  }

  // Check if adjacent vertices have buildings (distance rule)
  const hasAdjacentBuildings = vertex.adjacentVertices.some(adjId => {
    const adjVertex = state.vertices.find(v => v.id === adjId);
    return adjVertex?.building !== null;
  });

  if (hasAdjacentBuildings) {
    console.log(`Cannot build settlement - adjacent vertex has a building`);
    return false;
  }

  const building: Building = {
    type: BuildingType.SETTLEMENT,
    playerId: currentPlayer.id
  };

  // In setup phase, no resource cost
  if (state.phase === GamePhase.SETUP_SETTLEMENT_1 || state.phase === GamePhase.SETUP_SETTLEMENT_2) {
    if (currentPlayer.settlements <= 0) return false;

    // Place building on this vertex AND all equivalent vertices (same physical location)
    this.placeBuilding(state, vertexId, building);

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

    // Place building on this vertex AND all equivalent vertices
    this.placeBuilding(state, vertexId, building);

    currentPlayer.settlements--;
    currentPlayer.victoryPoints++;
  }

  this.checkVictory(state);
  this.gameState$.next(state);
  return true;
}

private placeBuilding(state: GameState, primaryVertexId: number, building: Building): void {
  // Place building on the primary vertex
  const primaryVertex = state.vertices.find(v => v.id === primaryVertexId);
  if (!primaryVertex) return;
  
  primaryVertex.building = building;
  console.log(`Placed ${building.type} on vertex ${primaryVertexId} (hex IDs: ${primaryVertex.adjacentHexes})`);

  // Find all vertices that share hex IDs with this vertex (they're at the same physical location)
  const sharedHexes = primaryVertex.adjacentHexes;
  if (sharedHexes.length > 0) {
    state.vertices.forEach((vertex, index) => {
      if (vertex.id !== primaryVertexId && !vertex.building) {
        // Vertices at the same physical location share 2 or more hexes (corner vertices)
        const sharedCount = vertex.adjacentHexes.filter(hexId => sharedHexes.includes(hexId)).length;
        if (sharedCount >= 2) {
          vertex.building = { ...building };
          console.log(`  Also placed ${building.type} on vertex ${vertex.id} (shared ${sharedCount} hexes: ${vertex.adjacentHexes})`);
        }
      }
    });
  }
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
    this.placeBuilding(state, vertexId, {
  type: BuildingType.CITY,
  playerId: currentPlayer.id
}); 
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

    console.log(`buildRoad called - edgeId: ${edgeId}, phase: ${state.phase}, player: ${state.currentPlayerIndex}`);

    const currentPlayer = state.players[state.currentPlayerIndex];
    const edge = state.edges.find(e => e.id === edgeId);

    if (!edge || edge.road) {
      console.log(`Cannot build road - edge not found or already has road`);
      return false;
    }

    // In setup phase
    if (state.phase === GamePhase.SETUP_ROAD_1 || state.phase === GamePhase.SETUP_ROAD_2) {
      if (currentPlayer.roads <= 0) return false;

      edge.road = { playerId: currentPlayer.id };
      currentPlayer.roads--;

      console.log('Road placed in setup phase, calling advanceSetupPhase...');
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
    console.log(`advanceSetupPhase called - Current phase: ${state.phase}, Current player: ${state.currentPlayerIndex}, Total players: ${state.players.length}`);
    
    if (state.phase === GamePhase.SETUP_ROAD_1) {
      if (state.currentPlayerIndex === state.players.length - 1) {
        console.log('Transitioning from SETUP_ROAD_1 to SETUP_SETTLEMENT_2 (last player in round 1)');
        state.phase = GamePhase.SETUP_SETTLEMENT_2;
      } else {
        console.log(`Advancing to next player: ${state.currentPlayerIndex} -> ${state.currentPlayerIndex + 1}`);
        state.currentPlayerIndex++;
        state.phase = GamePhase.SETUP_SETTLEMENT_1;
      }
    } else if (state.phase === GamePhase.SETUP_ROAD_2) {
      if (state.currentPlayerIndex === 0) {
        console.log('Setup complete! Transitioning to ROLL_DICE phase');
        state.phase = GamePhase.ROLL_DICE;
      } else {
        console.log(`Going to previous player: ${state.currentPlayerIndex} -> ${state.currentPlayerIndex - 1}`);
        state.currentPlayerIndex--;
        state.phase = GamePhase.SETUP_SETTLEMENT_2;
      }
    }
    
    console.log(`After advanceSetupPhase - New phase: ${state.phase}, New player: ${state.currentPlayerIndex}`);
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
