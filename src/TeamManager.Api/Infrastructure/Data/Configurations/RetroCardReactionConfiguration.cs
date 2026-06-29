using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroCardReactionConfiguration : IEntityTypeConfiguration<RetroCardReaction>
{
    public void Configure(EntityTypeBuilder<RetroCardReaction> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(r => r.MemberName).IsRequired().HasMaxLength(200);
        builder.Property(r => r.Emoji).IsRequired().HasMaxLength(16);

        builder.HasOne<RetroCard>()
            .WithMany()
            .HasForeignKey(r => r.CardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => new { r.CardId, r.MemberId, r.Emoji })
            .IsUnique()
            .HasDatabaseName("IX_RetroCardReaction_CardId_MemberId_Emoji");

        builder.HasIndex(r => r.SprintId);
    }
}
