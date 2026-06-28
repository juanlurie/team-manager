using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MeetingSeriesSlotConfiguration : IEntityTypeConfiguration<MeetingSeriesSlot>
{
    public void Configure(EntityTypeBuilder<MeetingSeriesSlot> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Date).IsRequired();
        builder.Property(s => s.StartTime).IsRequired();
        builder.Property(s => s.EndTime).IsRequired();

        builder.HasOne(s => s.MeetingSeries)
            .WithMany(s => s.Slots)
            .HasForeignKey(s => s.MeetingSeriesId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.Location)
            .WithMany()
            .HasForeignKey(s => s.LocationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}