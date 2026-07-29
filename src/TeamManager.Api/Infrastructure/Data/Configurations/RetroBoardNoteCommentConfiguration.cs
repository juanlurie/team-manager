using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardNoteCommentConfiguration : IEntityTypeConfiguration<RetroBoardNoteComment>
{
    public void Configure(EntityTypeBuilder<RetroBoardNoteComment> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        // Cascade from the note (which itself cascades from the session), so deleting a note takes
        // its comments with it — the same single cascade path the votes use.
        builder.HasOne(c => c.Note)
            .WithMany(n => n.Comments)
            .HasForeignKey(c => c.RetroBoardNoteId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Author)
            .WithMany()
            .HasForeignKey(c => c.AuthorMemberId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Property(c => c.AuthorGuestSessionId).HasMaxLength(64);
        builder.Property(c => c.AuthorDisplayName).HasMaxLength(100);
        builder.Property(c => c.Text).HasMaxLength(1000);

        builder.HasIndex(c => c.RetroBoardNoteId).HasDatabaseName("IX_RetroBoardNoteComment_NoteId");
    }
}
