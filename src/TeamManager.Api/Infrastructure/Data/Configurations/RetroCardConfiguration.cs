using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroCardConfiguration : IEntityTypeConfiguration<RetroCard>
{
    public void Configure(EntityTypeBuilder<RetroCard> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(c => c.Column).IsRequired().HasMaxLength(20);
        builder.Property(c => c.Text).IsRequired().HasMaxLength(500);
        builder.Property(c => c.AuthorName).IsRequired().HasMaxLength(200);

        builder.HasOne<Sprint>()
            .WithMany()
            .HasForeignKey(c => c.SprintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.SprintId);
    }
}
