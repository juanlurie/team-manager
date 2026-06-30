using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinMonthNominationConfiguration : IEntityTypeConfiguration<WinMonthNomination>
{
    public void Configure(EntityTypeBuilder<WinMonthNomination> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Description).HasMaxLength(2000);

        builder.HasOne(n => n.WinMonth)
            .WithMany(m => m.Nominations)
            .HasForeignKey(n => n.WinMonthId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(n => n.SourceWinWeek)
            .WithMany()
            .HasForeignKey(n => n.SourceWinWeekId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(n => n.Nominee)
            .WithMany()
            .HasForeignKey(n => n.NomineeMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(n => new { n.WinMonthId, n.NomineeMemberId }).IsUnique();
    }
}
