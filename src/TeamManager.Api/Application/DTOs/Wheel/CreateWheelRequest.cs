using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Wheel;

public record CreateWheelRequest([Required][MaxLength(100)] string Name);
