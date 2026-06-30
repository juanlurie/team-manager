using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class TimesheetEntryConfiguration : IEntityTypeConfiguration<TimesheetEntry>
{
    public void Configure(EntityTypeBuilder<TimesheetEntry> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(e => e.Project).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Category).IsRequired().HasMaxLength(200);
        builder.Property(e => e.WorkedFrom).IsRequired().HasMaxLength(20);
        builder.Property(e => e.Sentiment).IsRequired().HasMaxLength(10);
        builder.Property(e => e.Description).HasMaxLength(1000);
        builder.Property(e => e.TicketNumber).HasMaxLength(100);

        builder.HasOne(e => e.TeamMember)
            .WithMany()
            .HasForeignKey(e => e.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(e => new { e.TeamMemberId, e.Date });
    }
}
