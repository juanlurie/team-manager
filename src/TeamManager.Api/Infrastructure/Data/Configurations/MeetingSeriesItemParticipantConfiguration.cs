using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MeetingSeriesItemParticipantConfiguration : IEntityTypeConfiguration<MeetingSeriesItemParticipant>
{
    public void Configure(EntityTypeBuilder<MeetingSeriesItemParticipant> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(p => p.Role).IsRequired().HasMaxLength(20);

        builder.HasOne(p => p.MeetingSeriesItem)
            .WithMany(i => i.Participants)
            .HasForeignKey(p => p.MeetingSeriesItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(p => p.TeamMember)
            .WithMany()
            .HasForeignKey(p => p.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}