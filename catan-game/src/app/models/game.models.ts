// Resource types in Catan
export enum ResourceType {
  WOOD = 'wood',
  BRICK = 'brick',
  SHEEP = 'sheep',
  WHEAT = 'wheat',
  ORE = 'ore'
}

// Terrain types
export enum TerrainType {
  FOREST = 'forest',
  HILLS = 'hills',
  PASTURE = 'pasture',
  FIELDS = 'fields',
  MOUNTAINS = 'mountains',
  DESERT = 'desert'
}

// Development card types
export enum DevelopmentCardType {
  KNIGHT = 'knight',
  VICTORY_POINT = 'victoryPoint',
  ROAD_BUILDING = 'roadBuilding',
  YEAR_OF_PLENTY = 'yearOfPlenty',
  MONOPOLY = 'monopoly'
}

// Building types
export enum BuildingType {
  SETTLEMENT = 'settlement',
  CITY = 'city',
  ROAD = 'road'
}

// Resource card interface
export interface ResourceCard {
  type: ResourceType;
}

// Development card interface
export interface DevelopmentCard {
  type: DevelopmentCardType;
  played: boolean;
}

// Hex tile on the board
export interface HexTile {
  id: number;
  terrain: TerrainType;
  number: number | null; // null for desert
  hasRobber: boolean;
  row: number;
  col: number;
}

// Vertex (where settlements/cities are placed)
export interface Vertex {
  id: number;
  building: Building | null;
  adjacentHexes: number[]; // hex IDs
  adjacentVertices: number[]; // vertex IDs
  adjacentEdges: number[]; // edge IDs
}

// Edge (where roads are placed)
export interface Edge {
  id: number;
  road: Road | null;
  adjacentVertices: number[]; // vertex IDs (always 2)
  adjacentHexes: number[]; // hex IDs
}

// Building structure
export interface Building {
  type: BuildingType.SETTLEMENT | BuildingType.CITY;
  playerId: number;
}

// Road structure
export interface Road {
  playerId: number;
}

// Player interface
export interface Player {
  id: number;
  name: string;
  color: string;
  resources: Map<ResourceType, number>;
  developmentCards: DevelopmentCard[];
  settlements: number; // count available to build
  cities: number; // count available to build
  roads: number; // count available to build
  knightsPlayed: number;
  victoryPoints: number;
  longestRoad: boolean;
  largestArmy: boolean;
}

// Trade offer
export interface TradeOffer {
  offeringPlayerId: number;
  targetPlayerId: number | null; // null for bank trade
  offeredResources: Map<ResourceType, number>;
  requestedResources: Map<ResourceType, number>;
  status: 'pending' | 'accepted' | 'rejected';
}

// Game state
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  hexTiles: HexTile[];
  vertices: Vertex[];
  edges: Edge[];
  developmentCardDeck: DevelopmentCard[];
  phase: GamePhase;
  diceRoll: number | null;
  longestRoadPlayerId: number | null;
  largestArmyPlayerId: number | null;
  winner: number | null;
  tradeOffers: TradeOffer[];
}

// Game phases
export enum GamePhase {
  SETUP_SETTLEMENT_1 = 'setupSettlement1',
  SETUP_ROAD_1 = 'setupRoad1',
  SETUP_SETTLEMENT_2 = 'setupSettlement2',
  SETUP_ROAD_2 = 'setupRoad2',
  ROLL_DICE = 'rollDice',
  PLACE_ROBBER = 'placeRobber',
  MAIN = 'main',
  GAME_OVER = 'gameOver'
}

// Point coordinates for hex rendering
export interface Point {
  x: number;
  y: number;
}
