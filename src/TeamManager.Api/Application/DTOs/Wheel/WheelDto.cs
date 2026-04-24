namespace TeamManager.Api.Application.DTOs.Wheel;

public record WheelDto(Guid Id, string Name, List<WheelMemberDto> Participants);
