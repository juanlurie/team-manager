namespace TeamManager.Api.Application.DTOs.LeaveRecord;

public record ImportLeaveRecord(
    string Title,
    string Start,
    string End,
    string Type,
    string TotalDays,
    string Status
);

public record ImportLeaveRequest(IReadOnlyList<ImportLeaveRecord> Records, bool Override = false);

public record ImportLeaveResult(
    int Imported,
    int Overridden,
    int Duplicates,
    IReadOnlyList<string> UnknownMembers
);
