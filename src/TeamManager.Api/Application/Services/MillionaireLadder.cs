namespace TeamManager.Api.Application.Services;

// The fixed prize ladder for Quiz Game's Millionaire mode, modeled on the show's classic
// 15-question structure with two safe havens (after question 5 and question 10).
public static class MillionaireLadder
{
    public const int RoundCount = 15;

    public static readonly long[] PrizeValues =
    [
        100, 200, 300, 500, 1000,
        2000, 4000, 8000, 16000, 32000,
        64000, 125000, 250000, 500000, 1_000_000
    ];

    // 0-based round indexes that bank a guaranteed minimum once answered correctly.
    public static readonly int[] SafeHavenRoundIndexes = [4, 9];

    // The amount a participant keeps if eliminated while attempting `roundIndex` (i.e. they've
    // correctly answered everything before it, but not `roundIndex` itself).
    public static long SafeHavenAmount(int roundIndex)
    {
        var amount = 0L;
        foreach (var haven in SafeHavenRoundIndexes)
        {
            if (haven < roundIndex) amount = PrizeValues[haven];
        }
        return amount;
    }

    // 1-15 -> a difficulty tier for question generation: easy/medium/hard.
    public static string DifficultyTier(int roundIndex) =>
        roundIndex < 5 ? "easy" : roundIndex < 10 ? "medium" : "hard";
}
