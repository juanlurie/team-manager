using TeamManager.Api.Application.DTOs.Timesheet;

namespace TeamManager.Api.Application.Services;

public static class TimesheetApprovalRules
{
    public const decimal MinDailyHours = 6m;
    public const decimal MaxDailyHours = 10m;

    public static Dictionary<ImportedTimesheetEntry, List<string>> Evaluate(IReadOnlyList<ImportedTimesheetEntry> entries)
    {
        var violations = entries.ToDictionary(e => e, _ => new List<string>());

        foreach (var entry in entries)
        {
            if (entry.Date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                violations[entry].Add("Weekend work");
        }

        foreach (var dayGroup in entries.GroupBy(e => e.Date))
        {
            var totalHours = dayGroup.Sum(e => e.Hours + e.Minutes / 60m);
            if (totalHours < MinDailyHours)
                foreach (var entry in dayGroup) violations[entry].Add($"Low hours logged ({totalHours:0.##}h on {dayGroup.Key:yyyy-MM-dd})");
            else if (totalHours > MaxDailyHours)
                foreach (var entry in dayGroup) violations[entry].Add($"High hours logged ({totalHours:0.##}h on {dayGroup.Key:yyyy-MM-dd})");
        }

        return violations;
    }
}
