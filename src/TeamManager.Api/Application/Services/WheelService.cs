using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Wheel;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class WheelService(AppDbContext db) : IWheelService
{
    public async Task<IReadOnlyList<WheelDto>> GetAllAsync()
    {
        var wheels = await db.Wheels
            .Include(w => w.Participants)
            .ThenInclude(p => p.TeamMember)
            .OrderBy(w => w.CreatedAt)
            .ToListAsync();

        return wheels.Select(ToDto).ToList();
    }

    public async Task<WheelDto> CreateAsync(CreateWheelRequest request)
    {
        var wheel = new Wheel { Name = request.Name };
        db.Wheels.Add(wheel);
        await db.SaveChangesAsync();
        return ToDto(wheel);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var wheel = await db.Wheels.FindAsync(id);
        if (wheel is null) return false;
        db.Wheels.Remove(wheel);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<WheelDto?> AddParticipantAsync(Guid wheelId, Guid teamMemberId)
    {
        var wheel = await db.Wheels
            .Include(w => w.Participants).ThenInclude(p => p.TeamMember)
            .FirstOrDefaultAsync(w => w.Id == wheelId);
        if (wheel is null) return null;

        if (wheel.Participants.Any(p => p.TeamMemberId == teamMemberId)) return ToDto(wheel);

        var member = await db.TeamMembers.FindAsync(teamMemberId);
        if (member is null) return null;

        wheel.Participants.Add(new WheelParticipant { WheelId = wheelId, TeamMemberId = teamMemberId });
        await db.SaveChangesAsync();

        await db.Entry(wheel).Collection(w => w.Participants).LoadAsync();
        foreach (var p in wheel.Participants)
            await db.Entry(p).Reference(x => x.TeamMember).LoadAsync();

        return ToDto(wheel);
    }

    public async Task<WheelDto?> RemoveParticipantAsync(Guid wheelId, Guid teamMemberId)
    {
        var wheel = await db.Wheels
            .Include(w => w.Participants).ThenInclude(p => p.TeamMember)
            .FirstOrDefaultAsync(w => w.Id == wheelId);
        if (wheel is null) return null;

        var participant = wheel.Participants.FirstOrDefault(p => p.TeamMemberId == teamMemberId);
        if (participant is not null)
        {
            wheel.Participants.Remove(participant);
            await db.SaveChangesAsync();
        }

        return ToDto(wheel);
    }

    private static WheelDto ToDto(Wheel w) => new(
        w.Id,
        w.Name,
        w.Participants
            .OrderBy(p => p.TeamMember.FirstName).ThenBy(p => p.TeamMember.LastName)
            .Select(p => new WheelMemberDto(p.TeamMemberId, $"{p.TeamMember.FirstName} {p.TeamMember.LastName}"))
            .ToList()
    );
}
