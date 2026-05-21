using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class CoffeeRunMenuTemplateItemConfiguration : IEntityTypeConfiguration<CoffeeRunMenuTemplateItem>
{
    public void Configure(EntityTypeBuilder<CoffeeRunMenuTemplateItem> builder)
    {
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(i => i.Name).IsRequired().HasMaxLength(150);
        builder.Property(i => i.Price).HasColumnType("decimal(10,2)");
    }
}
