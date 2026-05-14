using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MeetingSessionConfiguration : IEntityTypeConfiguration<MeetingSession>
{
    public void Configure(EntityTypeBuilder<MeetingSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Title).IsRequired().HasMaxLength(200);
        builder.Property(s => s.Description).HasMaxLength(2000);
        builder.Property(s => s.Location).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Type).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(s => s.Status).IsRequired().HasConversion<string>().HasMaxLength(20);

        builder.HasOne(s => s.CreatedBy)
            .WithMany()
            .HasForeignKey(s => s.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(s => s.SessionDefinitionSlotId).IsRequired(false);
        builder.Property(s => s.SessionDefinitionId).IsRequired(false);

        builder.HasOne(s => s.SessionDefinitionSlot)
            .WithMany()
            .HasForeignKey(s => s.SessionDefinitionSlotId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.SessionDefinition)
            .WithMany()
            .HasForeignKey(s => s.SessionDefinitionId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => s.SessionDefinitionSlotId)
            .IsUnique()
            .HasFilter("\"SessionDefinitionSlotId\" IS NOT NULL");

        builder.HasIndex(s => s.SessionDefinitionId);

        builder.Property(s => s.MeetingSeriesItemId).IsRequired(false);
        builder.Property(s => s.MeetingSeriesSlotId).IsRequired(false);

        builder.HasOne(s => s.MeetingSeriesItem)
            .WithMany()
            .HasForeignKey(s => s.MeetingSeriesItemId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.MeetingSeriesSlot)
            .WithMany()
            .HasForeignKey(s => s.MeetingSeriesSlotId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
