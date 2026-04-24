using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class DiscussionPointConfiguration : IEntityTypeConfiguration<DiscussionPoint>
{
    public void Configure(EntityTypeBuilder<DiscussionPoint> builder)
    {
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(d => d.Title).IsRequired().HasMaxLength(500);
        builder.Property(d => d.Status).IsRequired().HasMaxLength(50);
        builder.Property(d => d.Priority).IsRequired().HasMaxLength(20);
    }
}
