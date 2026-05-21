using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class CoffeeRunMenuItemConfiguration : IEntityTypeConfiguration<CoffeeRunMenuItem>
{
    public void Configure(EntityTypeBuilder<CoffeeRunMenuItem> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(m => m.Name).IsRequired().HasMaxLength(100);
        builder.Property(m => m.Price).HasColumnType("decimal(10,2)");

        builder.HasOne(m => m.CoffeeRun)
            .WithMany(r => r.MenuItems)
            .HasForeignKey(m => m.CoffeeRunId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
