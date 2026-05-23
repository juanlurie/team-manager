using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class CoffeeRunOrderConfiguration : IEntityTypeConfiguration<CoffeeRunOrder>
{
    public void Configure(EntityTypeBuilder<CoffeeRunOrder> builder)
    {
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(o => o.Notes).HasMaxLength(500);
        builder.Property(o => o.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(o => o.TotalAmount).HasColumnType("decimal(10,2)");

        builder.HasOne(o => o.CoffeeRun)
            .WithMany(r => r.Orders)
            .HasForeignKey(o => o.CoffeeRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(o => o.TeamMember)
            .WithMany()
            .HasForeignKey(o => o.TeamMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(o => new { o.CoffeeRunId, o.TeamMemberId }).IsUnique();

        builder.HasMany(o => o.Items)
            .WithOne(i => i.Order)
            .HasForeignKey(i => i.CoffeeRunOrderId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
