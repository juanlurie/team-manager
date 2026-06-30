using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinSeriesConfiguration : IEntityTypeConfiguration<WinSeries>
{
    public void Configure(EntityTypeBuilder<WinSeries> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(s => s.Name).HasMaxLength(100).IsRequired();
        builder.Property(s => s.CreatedAt);

        builder.HasOne(s => s.CreatedBy)
            .WithMany()
            .HasForeignKey(s => s.CreatedByMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Weeks)
            .WithOne(w => w.Series)
            .HasForeignKey(w => w.WinSeriesId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
