using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WheelConfiguration : IEntityTypeConfiguration<Wheel>
{
    public void Configure(EntityTypeBuilder<Wheel> builder)
    {
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(w => w.Name).IsRequired().HasMaxLength(100);

        builder.HasMany(w => w.Participants)
            .WithOne(p => p.Wheel)
            .HasForeignKey(p => p.WheelId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
