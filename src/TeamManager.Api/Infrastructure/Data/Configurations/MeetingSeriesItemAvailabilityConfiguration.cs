using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MeetingSeriesItemAvailabilityConfiguration : IEntityTypeConfiguration<MeetingSeriesItemAvailability>
{
    public void Configure(EntityTypeBuilder<MeetingSeriesItemAvailability> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(a => a.Notes).HasMaxLength(1000);

        builder.HasOne(a => a.MeetingSeriesItem)
            .WithMany(i => i.Availabilities)
            .HasForeignKey(a => a.MeetingSeriesItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.MeetingSeriesSlot)
            .WithMany(s => s.Availabilities)
            .HasForeignKey(a => a.MeetingSeriesSlotId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.TeamMember)
            .WithMany()
            .HasForeignKey(a => a.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => new { a.MeetingSeriesItemId, a.MeetingSeriesSlotId, a.TeamMemberId })
            .IsUnique();
    }
}