import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../services/game.service';
import { GameState, HexTile, TerrainType, Point } from '../../models/game.models';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnInit {
  @Input() gameState!: GameState;

  hexSize = 80;
  hexes: (HexTile & { center: Point, vertices: Point[] })[] = [];
  viewBox = '0 0 1200 1000';

  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.calculateHexPositions();
  }

  calculateHexPositions(): void {
    const rows = [3, 4, 5, 4, 3];
    const hexWidth = this.hexSize * Math.sqrt(3);
    const hexHeight = this.hexSize * 2;
    
    // Center the widest row (5 hexes) in the viewBox
    // The middle hex (index 2) should be at the center X (600)
    const centerX = 600;
    const startX = centerX - 2 * hexWidth;
    const startY = 150;

    let hexIndex = 0;

    rows.forEach((count, rowIndex) => {
      const rowY = startY + rowIndex * (hexHeight * 0.75);
      const offsetX = (5 - count) * hexWidth / 2;

      for (let col = 0; col < count; col++) {
        const hex = this.gameState.hexTiles[hexIndex];
        const centerX = startX + offsetX + col * hexWidth;
        const centerY = rowY;

        const vertices = this.getHexVertices(centerX, centerY);

        this.hexes.push({
          ...hex,
          center: { x: centerX, y: centerY },
          vertices
        });

        hexIndex++;
      }
    });
  }

  getHexVertices(cx: number, cy: number): Point[] {
    const vertices: Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      vertices.push({
        x: cx + this.hexSize * Math.cos(angle),
        y: cy + this.hexSize * Math.sin(angle)
      });
    }
    return vertices;
  }

  getHexPoints(vertices: Point[]): string {
    return vertices.map(v => `${v.x},${v.y}`).join(' ');
  }

  getTerrainColor(terrain: TerrainType): string {
    const colors: { [key in TerrainType]: string } = {
      [TerrainType.FOREST]: 'url(#forestGradient)',
      [TerrainType.HILLS]: 'url(#hillsGradient)',
      [TerrainType.PASTURE]: 'url(#pastureGradient)',
      [TerrainType.FIELDS]: 'url(#fieldsGradient)',
      [TerrainType.MOUNTAINS]: 'url(#mountainsGradient)',
      [TerrainType.DESERT]: 'url(#desertGradient)'
    };
    return colors[terrain];
  }

  getTerrainGradient(terrain: TerrainType): string {
    const gradients: { [key in TerrainType]: string } = {
      [TerrainType.FOREST]: 'url(#forestGradient)',
      [TerrainType.HILLS]: 'url(#hillsGradient)',
      [TerrainType.PASTURE]: 'url(#pastureGradient)',
      [TerrainType.FIELDS]: 'url(#fieldsGradient)',
      [TerrainType.MOUNTAINS]: 'url(#mountainsGradient)',
      [TerrainType.DESERT]: 'url(#desertGradient)'
    };
    return gradients[terrain];
  }

  getTerrainPattern(terrain: TerrainType): string {
    const patterns: { [key in TerrainType]: string } = {
      [TerrainType.FOREST]: 'url(#forestPattern)',
      [TerrainType.HILLS]: 'url(#hillsPattern)',
      [TerrainType.PASTURE]: 'url(#pasturePattern)',
      [TerrainType.FIELDS]: 'url(#fieldsPattern)',
      [TerrainType.MOUNTAINS]: 'url(#mountainsPattern)',
      [TerrainType.DESERT]: 'url(#desertPattern)'
    };
    return patterns[terrain];
  }

  getTerrainName(terrain: TerrainType): string {
    return terrain.charAt(0).toUpperCase() + terrain.slice(1);
  }

  onHexClick(hex: HexTile): void {
    console.log('Hex clicked:', hex);
    
    // If in place robber phase, place the robber on this hex
    if (this.gameState.phase === 'placeRobber') {
      this.gameService.placeRobber(hex.id);
    }
  }

  onVertexClick(vertexId: number, event: MouseEvent): void {
    event.stopPropagation();
    console.log('Vertex clicked:', vertexId);
    
    if (this.gameState.phase.includes('setup') || this.gameState.phase === 'main') {
      this.gameService.buildSettlement(vertexId);
    }
  }

  onEdgeClick(edgeId: number, event: MouseEvent): void {
    event.stopPropagation();
    console.log('Edge clicked:', edgeId);
    
    if (this.gameState.phase.includes('setup') || this.gameState.phase === 'main') {
      this.gameService.buildRoad(edgeId);
    }
  }

  getVertexBuilding(vertexId: number) {
    return this.gameState.vertices[vertexId]?.building;
  }

  getEdgeRoad(edgeId: number) {
    return this.gameState.edges[edgeId]?.road;
  }

  getPlayerColor(playerId: number): string {
    return this.gameState.players.find(p => p.id === playerId)?.color || '#000';
  }
}
