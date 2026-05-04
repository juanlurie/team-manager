using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class DiscussionTaskConfiguration : IEntityTypeConfiguration<DiscussionTask>
{
    public void Configure(EntityTypeBuilder<DiscussionTask> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(t => t.Title).IsRequired().HasMaxLength(300);
        builder.Property(t => t.Description).HasMaxLength(1000);
        
        builder.HasOne(t => t.DiscussionPoint)
            .WithMany()
            .HasForeignKey(t => t.DiscussionPointId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(t => t.Assignee)
            .WithMany()
            .HasForeignKey(t => t.TeamMemberId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
