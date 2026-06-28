using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class AchievementConfiguration : IEntityTypeConfiguration<Achievement>
{
    public void Configure(EntityTypeBuilder<Achievement> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.HasIndex(a => a.Key).IsUnique();
        builder.Property(a => a.Key).HasMaxLength(50);
        builder.Property(a => a.Name).HasMaxLength(100);
        builder.Property(a => a.Icon).HasMaxLength(10);
        builder.Property(a => a.Category).HasMaxLength(50);
    }
}
