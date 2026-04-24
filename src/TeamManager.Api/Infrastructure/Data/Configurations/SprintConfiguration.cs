using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SprintConfiguration : IEntityTypeConfiguration<Sprint>
{
    public void Configure(EntityTypeBuilder<Sprint> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Name).IsRequired().HasMaxLength(100);

        builder.HasOne(s => s.PI)
            .WithMany(p => p.Sprints)
            .HasForeignKey(s => s.PIId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
