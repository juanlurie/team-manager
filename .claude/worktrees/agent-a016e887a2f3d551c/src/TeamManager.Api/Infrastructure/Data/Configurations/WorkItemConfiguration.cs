using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WorkItemConfiguration : IEntityTypeConfiguration<WorkItem>
{
    public void Configure(EntityTypeBuilder<WorkItem> builder)
    {
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(w => w.Title).IsRequired().HasMaxLength(500);
        builder.Property(w => w.Type).HasConversion<string>();
        builder.Property(w => w.Status).HasConversion<string>();
        builder.Property(w => w.ExternalTicketRef).HasMaxLength(100);
        builder.Property(w => w.EstimatedPoints).HasPrecision(5, 1);
        builder.Property(w => w.ActualPoints).HasPrecision(5, 1);

        builder.HasOne(w => w.SprintMember)
            .WithMany(sm => sm.WorkItems)
            .HasForeignKey(w => w.SprintMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(w => w.Feature)
            .WithMany(f => f.WorkItems)
            .HasForeignKey(w => w.FeatureId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(w => w.Milestone)
            .WithMany(m => m.WorkItems)
            .HasForeignKey(w => w.MilestoneId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
