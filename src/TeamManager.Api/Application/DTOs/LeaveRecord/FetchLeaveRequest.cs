namespace TeamManager.Api.Application.DTOs.LeaveRecord;

public record FetchLeaveRequest(
    string Cookie,
    IReadOnlyList<int> TeamIds,
    string Start,
    string End
);
