using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.WinOfTheWeek;

public record WowTimerRequest(
    [Range(5, 600)] int DurationSeconds = 60
);
