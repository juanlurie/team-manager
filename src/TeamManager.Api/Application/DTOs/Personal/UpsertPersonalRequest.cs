using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Personal;

public record UpsertPersonalRequest([MaxLength(10000)] string? PersonalMap);
