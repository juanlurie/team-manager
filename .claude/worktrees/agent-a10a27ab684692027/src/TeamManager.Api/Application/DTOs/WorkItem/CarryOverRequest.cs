using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WorkItem;

public record CarryOverRequest([Required] Guid TargetSprintId);
