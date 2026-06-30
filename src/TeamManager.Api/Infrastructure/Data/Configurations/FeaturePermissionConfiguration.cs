using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FeaturePermissionConfiguration : IEntityTypeConfiguration<FeaturePermission>
{
    public void Configure(EntityTypeBuilder<FeaturePermission> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(p => p.FeatureKey).IsRequired().HasMaxLength(50);
        builder.Property(p => p.Category).IsRequired().HasMaxLength(50);
        builder.Property(p => p.Label).IsRequired().HasMaxLength(100);
        builder.Property(p => p.Role).IsRequired().HasMaxLength(20);

        builder.HasIndex(p => new { p.FeatureKey, p.Role }).IsUnique().HasDatabaseName("IX_FeaturePermission_FeatureKey_Role");
    }
}
