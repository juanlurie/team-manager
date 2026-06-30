namespace TeamManager.Api.Application.DTOs.CoffeeRun;

public record CoffeeRunDto(Guid Id, string InitiatorName, string Status, DateTimeOffset CreatedAt);
