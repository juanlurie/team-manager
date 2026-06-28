using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroReactionConfiguration : IEntityTypeConfiguration<FunRetroReaction>
{
    public void Configure(EntityTypeBuilder<FunRetroReaction> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(r => r.Card)
            .WithMany(c => c.Reactions)
            .HasForeignKey(r => r.CardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(r => new { r.CardId, r.MemberId, r.Emoji })
            .IsUnique()
            .HasDatabaseName("IX_FunRetroReaction_CardId_MemberId_Emoji");
    }
}
