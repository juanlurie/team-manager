using System.Net.Http.Headers;
using System.Text.Json;
using TeamManager.Api.Application.DTOs.LeaveRecord;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface ILeaveFetcher
{
    bool IsConfigured { get; }
    Task<IReadOnlyList<ImportLeaveRecord>> FetchAsync(FetchLeaveRequest request);
}
