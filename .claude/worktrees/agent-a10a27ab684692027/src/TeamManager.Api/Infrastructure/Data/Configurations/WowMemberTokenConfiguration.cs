using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class WowMemberTokenConfiguration : IEntityTypeConfiguration<WowMemberToken>
{
    public void Configure(EntityTypeBuilder<WowMemberToken> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(t => t.Source).HasMaxLength(50).IsRequired();

        builder.HasOne(t => t.TeamMember)
            .WithMany()
            .HasForeignKey(t => t.TeamMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.WinWeek)
            .WithMany()
            .HasForeignKey(t => t.WinWeekId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.SpentOnNomination)
            .WithMany()
            .HasForeignKey(t => t.SpentOnNominationId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(t => new { t.WinWeekId, t.TeamMemberId, t.Source });
    }
}
