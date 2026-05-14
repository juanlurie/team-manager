using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MeetingSeriesItemConfiguration : IEntityTypeConfiguration<MeetingSeriesItem>
{
    public void Configure(EntityTypeBuilder<MeetingSeriesItem> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(i => i.Title).IsRequired().HasMaxLength(200);
        builder.Property(i => i.Description).HasMaxLength(2000);

        builder.HasOne(i => i.MeetingSeries)
            .WithMany(s => s.Items)
            .HasForeignKey(i => i.MeetingSeriesId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.ConfirmedSlot)
            .WithMany()
            .HasForeignKey(i => i.ConfirmedSlotId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}