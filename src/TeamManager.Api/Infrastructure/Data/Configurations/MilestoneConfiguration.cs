using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MilestoneConfiguration : IEntityTypeConfiguration<Milestone>
{
    public void Configure(EntityTypeBuilder<Milestone> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(m => m.Title).IsRequired().HasMaxLength(255);
        builder.Property(m => m.Status).HasConversion<string>();
        builder.Property(m => m.CreatedAt).HasDefaultValueSql("now()");
        builder.Property(m => m.UpdatedAt).HasDefaultValueSql("now()");

        builder.HasOne(m => m.PI)
            .WithMany(p => p.Milestones)
            .HasForeignKey(m => m.PIId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
