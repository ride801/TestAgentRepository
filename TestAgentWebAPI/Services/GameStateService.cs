using TestAgentWebAPI.Models;
using System.Collections.Concurrent;

namespace TestAgentWebAPI.Services;

public class GameStateService
{
    private readonly ConcurrentDictionary<string, GameState> _games = new();
    private static readonly string[] PlayerColors = { "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F" };

    public GameState? CreateGame(List<string> playerNames)
    {
        if (playerNames.Count < 2 || playerNames.Count > 6)
        {
            return null;
        }

        var gameState = new GameState
        {
            GameId = Guid.NewGuid().ToString(),
            Phase = GamePhase.SetupSettlement1,
            CurrentPlayerIndex = 0,
            CreatedAt = DateTime.UtcNow
        };

        // Create players
        for (int i = 0; i < playerNames.Count; i++)
        {
            var player = new Player
            {
                Id = i,
                Name = playerNames[i],
                Color = PlayerColors[i]
            };

            // Initialize resources
            foreach (ResourceType resource in Enum.GetValues<ResourceType>())
            {
                player.Resources[resource] = 0;
            }

            gameState.Players.Add(player);
        }

        // Create hex board
        gameState.HexTiles = CreateHexBoard();

        _games[gameState.GameId] = gameState;
        return gameState;
    }

    public GameState? GetGame(string gameId)
    {
        _games.TryGetValue(gameId, out var game);
        return game;
    }

    public List<GameState> GetAllGames()
    {
        return _games.Values.ToList();
    }

    public bool DeleteGame(string gameId)
    {
        return _games.TryRemove(gameId, out _);
    }

    public GameState? UpdateGameState(string gameId, GameState updatedState)
    {
        if (_games.TryGetValue(gameId, out var existingGame))
        {
            _games[gameId] = updatedState;
            return updatedState;
        }
        return null;
    }

    private List<HexTile> CreateHexBoard()
    {
        var terrainDistribution = new List<TerrainType>
        {
            TerrainType.Forest, TerrainType.Forest, TerrainType.Forest, TerrainType.Forest,
            TerrainType.Hills, TerrainType.Hills, TerrainType.Hills,
            TerrainType.Pasture, TerrainType.Pasture, TerrainType.Pasture, TerrainType.Pasture,
            TerrainType.Fields, TerrainType.Fields, TerrainType.Fields, TerrainType.Fields,
            TerrainType.Mountains, TerrainType.Mountains, TerrainType.Mountains,
            TerrainType.Desert
        };

        var numberDistribution = new List<int> { 2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12 };

        // Shuffle
        var random = new Random();
        terrainDistribution = terrainDistribution.OrderBy(x => random.Next()).ToList();
        numberDistribution = numberDistribution.OrderBy(x => random.Next()).ToList();

        var hexes = new List<HexTile>();
        int hexId = 0;
        int numberIndex = 0;

        var rows = new[] { 3, 4, 5, 4, 3 };
        for (int rowIndex = 0; rowIndex < rows.Length; rowIndex++)
        {
            for (int col = 0; col < rows[rowIndex]; col++)
            {
                var terrain = terrainDistribution[hexId];
                var isDesert = terrain == TerrainType.Desert;

                hexes.Add(new HexTile
                {
                    Id = hexId,
                    Terrain = terrain,
                    Number = isDesert ? null : numberDistribution[numberIndex++],
                    HasRobber = isDesert,
                    Row = rowIndex,
                    Col = col
                });

                hexId++;
            }
        }

        return hexes;
    }

    public (int dice1, int dice2) RollDice(string gameId)
    {
        var game = GetGame(gameId);
        if (game == null) return (0, 0);

        var random = new Random();
        var dice1 = random.Next(1, 7);
        var dice2 = random.Next(1, 7);
        
        game.DiceRoll = dice1 + dice2;
        
        if (game.DiceRoll == 7)
        {
            game.Phase = GamePhase.PlaceRobber;
        }
        else
        {
            game.Phase = GamePhase.Main;
        }

        return (dice1, dice2);
    }
}
