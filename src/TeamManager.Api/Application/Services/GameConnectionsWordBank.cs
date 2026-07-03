namespace TeamManager.Api.Application.Services;

public enum ConnectionsDifficulty { Yellow = 0, Green = 1, Blue = 2, Purple = 3 }

public record ConnectionsGroup(ConnectionsDifficulty Difficulty, string Label, string[] Words);
public record ConnectionsPuzzle(string Title, ConnectionsGroup[] Groups);

/// <summary>Curated puzzle content -- original, dev-team-flavored categories, not copied from
/// real NYT Connections puzzles. A puzzle is picked once per session (see
/// GameConnectionsService.StartSessionAsync) and snapshotted into the session, never
/// re-read from here after that -- see GameConnectionsSession.PuzzleJson.</summary>
public static class GameConnectionsWordBank
{
    public static readonly ConnectionsPuzzle[] Puzzles =
    [
        new ConnectionsPuzzle("Sprint Zero", [
            new(ConnectionsDifficulty.Yellow, "TYPES OF MEETINGS", ["STANDUP", "RETRO", "PLANNING", "SYNC"]),
            new(ConnectionsDifficulty.Green, "___ REVIEW", ["CODE", "PEER", "DESIGN", "PERFORMANCE"]),
            new(ConnectionsDifficulty.Blue, "STAND-UP EXCUSES", ["TRAFFIC", "WIFI", "DENTIST", "CALENDAR"]),
            new(ConnectionsDifficulty.Purple, "WORDS CONTAINING A GIT COMMAND", ["PUSHOVER", "PULLEY", "CLONED", "STASHED"]),
        ]),

        new ConnectionsPuzzle("On Fire", [
            new(ConnectionsDifficulty.Yellow, "COFFEE ORDERS", ["LATTE", "ESPRESSO", "POUROVER", "CORTADO"]),
            new(ConnectionsDifficulty.Green, "PRODUCTION INCIDENT SEVERITIES", ["SEV1", "SEV2", "SEV3", "SEV4"]),
            new(ConnectionsDifficulty.Blue, "THINGS ALWAYS \"ALMOST DONE\"", ["MIGRATION", "REFACTOR", "DOCS", "MVP"]),
            new(ConnectionsDifficulty.Purple, "___ ON CALL", ["PAGED", "BURNT", "STAND", "PASSED"]),
        ]),

        new ConnectionsPuzzle("Merge Conflict", [
            new(ConnectionsDifficulty.Yellow, "PULL REQUEST STATES", ["DRAFT", "OPEN", "APPROVED", "MERGED"]),
            new(ConnectionsDifficulty.Green, "THINGS THAT GET SQUASHED", ["COMMITS", "BUGS", "MORALE", "GRAPES"]),
            new(ConnectionsDifficulty.Blue, "___ DEBT", ["TECH", "SLEEP", "CREDIT", "KARMA"]),
            new(ConnectionsDifficulty.Purple, "SOUND LIKE TESTING TERMS, BUT AREN'T", ["MOCKERY", "STUBBORN", "ASSERTIVE", "FIXTURED"]),
        ]),

        new ConnectionsPuzzle("Rubber Duck", [
            new(ConnectionsDifficulty.Yellow, "BATH TOYS", ["DUCK", "BOAT", "SUBMARINE", "SPONGE"]),
            new(ConnectionsDifficulty.Green, "DEBUGGING TECHNIQUES", ["BREAKPOINT", "PRINTLN", "STEPTHROUGH", "RUBBERDUCK"]),
            new(ConnectionsDifficulty.Blue, "___ ENVIRONMENT", ["STAGING", "PROD", "SANDBOX", "LOCAL"]),
            new(ConnectionsDifficulty.Purple, "HTTP STATUS CODE VIBES", ["FORBIDDEN", "TEAPOT", "GONE", "UNAUTHORIZED"]),
        ]),

        new ConnectionsPuzzle("Scope Creep", [
            new(ConnectionsDifficulty.Yellow, "PLANNING POKER CARDS", ["ONE", "THREE", "FIVE", "EIGHT"]),
            new(ConnectionsDifficulty.Green, "WAYS A TICKET GROWS", ["SCOPE", "CREEP", "REQUIREMENT", "EDGECASE"]),
            new(ConnectionsDifficulty.Blue, "___ FLAG", ["FEATURE", "RED", "GREEN", "PIRATE"]),
            new(ConnectionsDifficulty.Purple, "SOUND LIKE AGILE CEREMONIES, BUT AREN'T", ["STANDDOWN", "RETROFIT", "SPRINKLE", "BACKLOT"]),
        ]),

        new ConnectionsPuzzle("Works On My Machine", [
            new(ConnectionsDifficulty.Yellow, "OPERATING SYSTEMS", ["LINUX", "WINDOWS", "MACOS", "ANDROID"]),
            new(ConnectionsDifficulty.Green, "REASONS THE BUILD FAILED", ["DEPENDENCY", "TIMEOUT", "FLAKY", "CACHE"]),
            new(ConnectionsDifficulty.Blue, "___ ENGINEER", ["SITE", "SOFTWARE", "SOUND", "SANITATION"]),
            new(ConnectionsDifficulty.Purple, "WORDS CONTAINING A PROGRAMMING LANGUAGE", ["GOLIATH", "RUSTIC", "JAVANESE", "BASICALLY"]),
        ]),

        new ConnectionsPuzzle("Rate Limited", [
            new(ConnectionsDifficulty.Yellow, "HTTP METHODS", ["GET", "POST", "PUT", "PATCH"]),
            new(ConnectionsDifficulty.Green, "SIGNS THE STANDUP RAN LONG", ["TANGENT", "RABBITHOLE", "SIDEBAR", "OVERTIME"]),
            new(ConnectionsDifficulty.Blue, "___ LIMIT", ["RATE", "SPEED", "CHARACTER", "TIME"]),
            new(ConnectionsDifficulty.Purple, "EVERYDAY WORDS THAT ARE ALSO TECH GIANTS", ["AZURE", "AMAZON", "ORACLE", "APPLE"]),
        ]),
    ];
}
