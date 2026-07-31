using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardNoteConfiguration : IEntityTypeConfiguration<RetroBoardNote>
{
    public void Configure(EntityTypeBuilder<RetroBoardNote> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(n => n.Session)
            .WithMany(s => s.Notes)
            .HasForeignKey(n => n.RetroBoardSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        // Restrict (not Cascade) so there's a single cascade path from the session, and
        // deleting a column that still holds notes is blocked rather than silently mass-deleting.
        builder.HasOne(n => n.Column)
            .WithMany(c => c.Notes)
            .HasForeignKey(n => n.RetroBoardColumnId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(n => n.Author)
            .WithMany()
            .HasForeignKey(n => n.AuthorMemberId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.Property(n => n.AuthorGuestSessionId).HasMaxLength(64);
        builder.Property(n => n.GroupLabel).HasMaxLength(120);

        // Deliberately a plain column, not an FK to RetroBoardNote: the anchor points at itself, and a
        // self-referencing FK would fight the session's single cascade path on delete. The service
        // maintains the invariant (dissolve or promote when an anchor goes) -- see SetNoteGroupAsync.
        builder.HasIndex(n => n.GroupId).HasDatabaseName("IX_RetroBoardNote_GroupId");

        builder.HasIndex(n => n.RetroBoardSessionId).HasDatabaseName("IX_RetroBoardNote_SessionId");
        builder.HasIndex(n => n.RetroBoardColumnId).HasDatabaseName("IX_RetroBoardNote_ColumnId");
    }
}
