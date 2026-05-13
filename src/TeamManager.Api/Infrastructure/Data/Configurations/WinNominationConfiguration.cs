using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WinNominationConfiguration : IEntityTypeConfiguration<WinNomination>
{
    public void Configure(EntityTypeBuilder<WinNomination> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Description).HasMaxLength(2000);

        builder.HasOne(n => n.WinWeek)
            .WithMany(w => w.Nominations)
            .HasForeignKey(n => n.WinWeekId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(n => n.TeamMember)
            .WithMany()
            .HasForeignKey(n => n.TeamMemberId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(n => n.Nominee)
            .WithMany()
            .HasForeignKey(n => n.NomineeMemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
