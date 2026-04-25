namespace TeamManager.Api.Application.DTOs.Sprint;

public record UpdateRetroRequest(string? WentWell, string? DidntGoWell, string? ActionItems);
