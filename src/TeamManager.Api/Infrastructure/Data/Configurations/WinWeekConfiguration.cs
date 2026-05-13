using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinWeekConfiguration : IEntityTypeConfiguration<WinWeek>
{
    public void Configure(EntityTypeBuilder<WinWeek> builder)
    {
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.HasIndex(w => w.WeekStart).IsUnique();
        builder.Property(w => w.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasOne(w => w.Winner)
            .WithMany()
            .HasForeignKey(w => w.WinnerNominationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
