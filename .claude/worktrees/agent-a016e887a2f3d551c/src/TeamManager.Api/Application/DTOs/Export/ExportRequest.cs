namespace TeamManager.Api.Application.DTOs.Export;

public record ExportRequest(
    Guid SprintId,
    Guid? TeamLeadId
);
