using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardVoteConfiguration : IEntityTypeConfiguration<RetroBoardVote>
{
    public void Configure(EntityTypeBuilder<RetroBoardVote> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(v => v.Note)
            .WithMany(n => n.Votes)
            .HasForeignKey(v => v.RetroBoardNoteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Property(v => v.GuestSessionId).HasMaxLength(64);

        // Optional now that guests (no member) can vote; inferred from the nullable MemberId, stated
        // for clarity.
        builder.HasOne(v => v.Member)
            .WithMany()
            .HasForeignKey(v => v.MemberId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);

        // No unique constraint -- a voter may spend multiple votes on one note (up to the per-note cap).
        // One index per voter kind, for the "votes by this voter" count queries.
        builder.HasIndex(v => new { v.RetroBoardNoteId, v.MemberId })
            .HasDatabaseName("IX_RetroBoardVote_NoteId_MemberId");
        builder.HasIndex(v => new { v.RetroBoardNoteId, v.GuestSessionId })
            .HasDatabaseName("IX_RetroBoardVote_NoteId_GuestSessionId");
    }
}
