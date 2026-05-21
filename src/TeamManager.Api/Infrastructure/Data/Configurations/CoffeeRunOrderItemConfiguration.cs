using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class CoffeeRunOrderItemConfiguration : IEntityTypeConfiguration<CoffeeRunOrderItem>
{
    public void Configure(EntityTypeBuilder<CoffeeRunOrderItem> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(i => i.Quantity).IsRequired();

        builder.HasOne(i => i.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.CoffeeRunOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(i => i.MenuItem)
            .WithMany(m => m.OrderItems)
            .HasForeignKey(i => i.CoffeeRunMenuItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
