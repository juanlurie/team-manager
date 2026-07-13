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

        builder.HasOne(v => v.Member)
            .WithMany()
            .HasForeignKey(v => v.MemberId)
            .OnDelete(DeleteBehavior.Restrict);

        // No unique (Note, Member) constraint -- a member may spend multiple votes on one note.
        builder.HasIndex(v => new { v.RetroBoardNoteId, v.MemberId })
            .HasDatabaseName("IX_RetroBoardVote_NoteId_MemberId");
    }
}
