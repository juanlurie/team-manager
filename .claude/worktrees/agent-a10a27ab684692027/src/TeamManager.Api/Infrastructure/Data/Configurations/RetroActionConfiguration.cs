using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroActionConfiguration : IEntityTypeConfiguration<RetroAction>
{
    public void Configure(EntityTypeBuilder<RetroAction> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(r => r.Title).IsRequired().HasMaxLength(500);
        builder.Property(r => r.AssignedTo).HasMaxLength(200);
        builder.Property(r => r.Status).IsRequired().HasMaxLength(20);

        builder.HasOne<Sprint>()
            .WithMany()
            .HasForeignKey(r => r.SprintId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => r.SprintId);
    }
}
