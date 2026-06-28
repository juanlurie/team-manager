namespace TeamManager.Api.Application.Services;

internal static class GameNameHelper
{
    internal static IReadOnlyList<string> DeduplicateFirstNames(IReadOnlyList<string> fullNames)
    {
        var firstNames = fullNames.Select(FirstOf).ToList();
        return fullNames.Select((full, i) =>
            firstNames.Count(fn => fn == firstNames[i]) > 1 ? full : firstNames[i]
        ).ToArray();
    }

    private static string FirstOf(string fullName)
    {
        var idx = fullName.IndexOf(' ');
        return idx > 0 ? fullName[..idx] : fullName;
    }
}
