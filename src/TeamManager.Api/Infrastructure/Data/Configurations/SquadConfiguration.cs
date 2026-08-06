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

        // SetNull, never Cascade: SquadMember cascades from Squad, so a cascading
        // team delete would silently wipe every squad membership beneath it.
        // Deleting a team detaches its squads instead.
        builder.HasOne(s => s.Team)
            .WithMany(t => t.Squads)
            .HasForeignKey(s => s.TeamId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
