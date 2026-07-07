using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroCustomThemeImageConfiguration : IEntityTypeConfiguration<RetroCustomThemeImage>
{
    public void Configure(EntityTypeBuilder<RetroCustomThemeImage> builder)
    {
        builder.HasKey(i => new { i.ThemeId, i.Variant });

        builder.HasOne(i => i.Theme)
            .WithMany(t => t.Images)
            .HasForeignKey(i => i.ThemeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
