using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SlotLocationConfiguration : IEntityTypeConfiguration<SlotLocation>
{
    public void Configure(EntityTypeBuilder<SlotLocation> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(l => l.Name).HasMaxLength(100).IsRequired();
        builder.Property(l => l.Color).HasMaxLength(20).IsRequired();
        builder.Property(l => l.IsActive).IsRequired();
        builder.Property(l => l.SortOrder).IsRequired();
    }
}
