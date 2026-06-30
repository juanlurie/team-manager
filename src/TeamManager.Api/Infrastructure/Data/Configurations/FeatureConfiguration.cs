using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FeatureConfiguration : IEntityTypeConfiguration<Feature>
{
    public void Configure(EntityTypeBuilder<Feature> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(f => f.Title).IsRequired().HasMaxLength(500);
        builder.Property(f => f.ExternalTicketRef).HasMaxLength(100);
        builder.Property(f => f.Status).HasConversion<string>();
        builder.Property(f => f.EstimatedDays).HasColumnType("decimal(6,1)");

        builder.HasOne(f => f.Sprint)
            .WithMany(s => s.Features)
            .HasForeignKey(f => f.SprintId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
