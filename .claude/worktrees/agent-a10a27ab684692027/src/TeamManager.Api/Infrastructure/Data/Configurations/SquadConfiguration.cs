using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SquadConfiguration : IEntityTypeConfiguration<Squad>
{
    public void Configure(EntityTypeBuilder<Squad> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Name).HasMaxLength(100).IsRequired();
        builder.Property(s => s.Color).HasMaxLength(20);
    }
}
