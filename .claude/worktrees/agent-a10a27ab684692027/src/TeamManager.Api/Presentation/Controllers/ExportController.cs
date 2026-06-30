using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("export")]
[Route("api/v1/export")]
public class ExportController(IDashboardService dashboardService, IPptxExportService exportService) : ControllerBase
{
    [HttpPost("pptx")]
    [RequestSizeLimit(52_428_800)] // 50 MB
    public async Task<IActionResult> ExportPptx(
        [FromForm] IFormFile template,
        [FromForm] Guid sprintId,
        [FromForm] Guid? teamLeadId)
    {
        var dashboard = await dashboardService.GetSprintDashboardAsync(sprintId, teamLeadId);
        if (dashboard is null)
            return NotFound("Sprint not found.");

        await using var stream = template.OpenReadStream();
        var bytes = await exportService.GenerateAsync(stream, dashboard);

        return File(bytes,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            $"sprint-report-{dashboard.Sprint.Name}.pptx");
    }
}
