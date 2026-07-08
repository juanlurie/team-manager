using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroCustomThemeConfiguration : IEntityTypeConfiguration<RetroCustomTheme>
{
    public void Configure(EntityTypeBuilder<RetroCustomTheme> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasIndex(t => t.OverridesBuiltInId)
            .IsUnique()
            .HasFilter("\"OverridesBuiltInId\" IS NOT NULL");
    }
}
