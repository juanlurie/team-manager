using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WheelParticipantConfiguration : IEntityTypeConfiguration<WheelParticipant>
{
    public void Configure(EntityTypeBuilder<WheelParticipant> builder)
    {
        builder.HasKey(p => new { p.WheelId, p.TeamMemberId });

        builder.HasOne(p => p.TeamMember)
            .WithMany()
            .HasForeignKey(p => p.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
