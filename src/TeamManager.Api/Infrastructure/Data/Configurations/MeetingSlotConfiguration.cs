using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MeetingSlotConfiguration : IEntityTypeConfiguration<MeetingSlot>
{
    public void Configure(EntityTypeBuilder<MeetingSlot> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Type).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Notes).HasMaxLength(500);
        builder.Property(s => s.Date).IsRequired(false);

        builder.HasOne(s => s.MeetingSession)
            .WithMany(ms => ms.Slots)
            .HasForeignKey(s => s.MeetingSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.TeamMember)
            .WithMany()
            .HasForeignKey(s => s.TeamMemberId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.Location)
            .WithMany(l => l.Slots)
            .HasForeignKey(s => s.LocationId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);
    }
}
