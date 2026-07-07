using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroThemeImageConfiguration : IEntityTypeConfiguration<FunRetroThemeImage>
{
    public void Configure(EntityTypeBuilder<FunRetroThemeImage> builder)
    {
        builder.HasKey(i => i.SessionId);

        builder.HasOne(i => i.Session)
            .WithOne()
            .HasForeignKey<FunRetroThemeImage>(i => i.SessionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
