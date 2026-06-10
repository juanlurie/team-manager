using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public static class ConfigVariableResolver
{
    public static async Task<Dictionary<string, string>> LoadAsync(AppDbContext db) =>
        await db.ConfigVariables
            .ToDictionaryAsync(v => v.Key, v => v.Value);

    public static string Apply(string template, Dictionary<string, string> configVars)
    {
        var result = template;
        foreach (var (key, value) in configVars)
            result = result.Replace($"{{{key}}}", value);
        return result;
    }
}
