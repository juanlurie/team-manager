using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TimesheetConfigService(AppDbContext db) : ITimesheetConfigService
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    public async Task<TimesheetConfigDto> GetAsync(Guid memberId)
    {
        var config = await db.MemberTimesheetConfigs.FindAsync(memberId);
        return config is null ? Empty() : ToDto(config);
    }

    public async Task<TimesheetConfigDto> UpsertAsync(Guid memberId, UpsertTimesheetConfigRequest request)
    {
        var config = await db.MemberTimesheetConfigs.FindAsync(memberId);
        if (config is null)
        {
            config = new MemberTimesheetConfig { TeamMemberId = memberId };
            db.MemberTimesheetConfigs.Add(config);
        }

        if (request.ExtraProjects is not null)
            config.ExtraProjectsJson = JsonSerializer.Serialize(request.ExtraProjects);
        if (request.ExtraCategories is not null)
            config.ExtraCategoriesJson = JsonSerializer.Serialize(request.ExtraCategories);
        if (request.QuickActions is not null)
            config.QuickActionsJson = JsonSerializer.Serialize(request.QuickActions);
        if (request.WorkLocationOptions is not null)
            config.WorkLocationOptionsJson = JsonSerializer.Serialize(request.WorkLocationOptions);

        await db.SaveChangesAsync();
        return ToDto(config);
    }

    private static TimesheetConfigDto ToDto(MemberTimesheetConfig c) => new(
        JsonSerializer.Deserialize<string[]>(c.ExtraProjectsJson, Json) ?? [],
        JsonSerializer.Deserialize<Dictionary<string, string[]>>(c.ExtraCategoriesJson, Json) ?? [],
        (JsonSerializer.Deserialize<List<QuickActionConfigDto>>(c.QuickActionsJson, Json) ?? []).ToArray(),
        JsonSerializer.Deserialize<string[]>(c.WorkLocationOptionsJson, Json) ?? ["Home", "Other", "Client", "Entelect"]
    );

    private static TimesheetConfigDto Empty() => new([], [], [], ["Home", "Other", "Client", "Entelect"]);
}
