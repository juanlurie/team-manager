using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinMonthConfiguration : IEntityTypeConfiguration<WinMonth>
{
    public void Configure(EntityTypeBuilder<WinMonth> builder)
    {
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.HasIndex(m => new { m.Year, m.Month }).IsUnique();
        builder.Property(m => m.Status).HasConversion<string>().HasMaxLength(20);

        builder.HasOne(m => m.Winner)
            .WithMany()
            .HasForeignKey(m => m.WinnerNominationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
