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
