using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace TestAgentWebAPI.Models;

public enum ResourceType
{
    Wood,
    Brick,
    Sheep,
    Wheat,
    Ore
}

public enum TerrainType
{
    Forest,
    Hills,
    Pasture,
    Fields,
    Mountains,
    Desert
}

public enum GamePhase
{
    SetupSettlement1,
    SetupRoad1,
    SetupSettlement2,
    SetupRoad2,
    RollDice,
    PlaceRobber,
    Main,
    GameOver
}

public class Player
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public Dictionary<ResourceType, int> Resources { get; set; } = new();
    public int Settlements { get; set; } = 5;
    public int Cities { get; set; } = 4;
    public int Roads { get; set; } = 15;
    public int KnightsPlayed { get; set; }
    public int VictoryPoints { get; set; }
    public bool LongestRoad { get; set; }
    public bool LargestArmy { get; set; }
}

public class HexTile
{
    public int Id { get; set; }
    public TerrainType Terrain { get; set; }
    public int? Number { get; set; }
    public bool HasRobber { get; set; }
    public int Row { get; set; }
    public int Col { get; set; }
}

public class GameState
{
    public string GameId { get; set; } = Guid.NewGuid().ToString();
    public List<Player> Players { get; set; } = new();
    public int CurrentPlayerIndex { get; set; }
    public List<HexTile> HexTiles { get; set; } = new();
    public GamePhase Phase { get; set; }
    public int? DiceRoll { get; set; }
    public int? Winner { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateGameRequest
{
    public List<string> PlayerNames { get; set; } = new();
}

public class GameAction
{
    public string Action { get; set; } = string.Empty;
    public Dictionary<string, object>? Parameters { get; set; }
}
