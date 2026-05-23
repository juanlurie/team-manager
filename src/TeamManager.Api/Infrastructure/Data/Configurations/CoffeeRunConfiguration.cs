using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class CoffeeRunConfiguration : IEntityTypeConfiguration<CoffeeRun>
{
    public void Configure(EntityTypeBuilder<CoffeeRun> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(r => r.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.Title).HasMaxLength(200);
        builder.Property(r => r.Description).HasMaxLength(1000);
        builder.Property(r => r.Location).HasMaxLength(200);

        builder.HasIndex(r => r.CreatedAt).HasDatabaseName("IX_CoffeeRun_CreatedAt");
        builder.HasIndex(r => r.Status).HasDatabaseName("IX_CoffeeRun_Status");
        builder.HasIndex(r => r.InitiatorId).HasDatabaseName("IX_CoffeeRun_InitiatorId");

        builder.HasOne(r => r.Initiator)
            .WithMany()
            .HasForeignKey(r => r.InitiatorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(r => r.MenuItems)
            .WithOne(m => m.CoffeeRun)
            .HasForeignKey(m => m.CoffeeRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(r => r.Orders)
            .WithOne(o => o.CoffeeRun)
            .HasForeignKey(o => o.CoffeeRunId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
