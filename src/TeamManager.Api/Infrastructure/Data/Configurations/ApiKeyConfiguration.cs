using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class ApiKeyConfiguration : IEntityTypeConfiguration<ApiKey>
{
    public void Configure(EntityTypeBuilder<ApiKey> builder)
    {
        builder.HasKey(k => k.Id);
        builder.Property(k => k.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(k => k.Name).IsRequired().HasMaxLength(100);
        builder.Property(k => k.KeyHash).IsRequired().HasMaxLength(64);
        builder.HasIndex(k => k.KeyHash).IsUnique();

        builder.HasOne(k => k.TeamMember)
            .WithMany()
            .HasForeignKey(k => k.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(k => k.IsActive);
    }
}
