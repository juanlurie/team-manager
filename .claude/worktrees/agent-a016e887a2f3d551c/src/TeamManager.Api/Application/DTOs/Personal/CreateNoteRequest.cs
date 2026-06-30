using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Personal;

public record CreateNoteRequest([Required][MaxLength(5000)] string Text);
