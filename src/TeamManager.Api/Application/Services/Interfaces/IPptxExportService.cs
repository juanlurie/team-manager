using TeamManager.Api.Application.DTOs.Dashboard;

namespace TeamManager.Api.Application.Services.Interfaces;

public interface IPptxExportService
{
    Task<byte[]> GenerateAsync(Stream templateStream, SprintDashboardDto dashboard);
}
