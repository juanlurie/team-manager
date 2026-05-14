using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class SessionDefinitionParticipantConfiguration : IEntityTypeConfiguration<SessionDefinitionParticipant>
{
    public void Configure(EntityTypeBuilder<SessionDefinitionParticipant> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(p => p.Role).IsRequired().HasConversion<string>().HasMaxLength(20);

        builder.HasOne(p => p.SessionDefinition)
            .WithMany(s => s.Participants)
            .HasForeignKey(p => p.SessionDefinitionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(p => p.TeamMember)
            .WithMany()
            .HasForeignKey(p => p.TeamMemberId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
