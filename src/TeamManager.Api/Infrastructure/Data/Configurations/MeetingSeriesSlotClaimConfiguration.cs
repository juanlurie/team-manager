using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MeetingSeriesSlotClaimConfiguration : IEntityTypeConfiguration<MeetingSeriesSlotClaim>
{
    public void Configure(EntityTypeBuilder<MeetingSeriesSlotClaim> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.ClaimedAt).IsRequired();

        builder.HasOne(c => c.MeetingSeries)
            .WithMany()
            .HasForeignKey(c => c.MeetingSeriesId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.MeetingSeriesSlot)
            .WithMany()
            .HasForeignKey(c => c.MeetingSeriesSlotId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.MeetingSeriesItem)
            .WithMany()
            .HasForeignKey(c => c.MeetingSeriesItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.ClaimedByMember)
            .WithMany()
            .HasForeignKey(c => c.ClaimedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => new { c.MeetingSeriesId, c.MeetingSeriesSlotId })
            .IsUnique()
            .HasDatabaseName("UQ_SlotClaim_Series_Slot");

        builder.HasIndex(c => c.MeetingSeriesItemId);
        builder.HasIndex(c => c.ClaimedByMemberId);
    }
}
