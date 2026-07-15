using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class RetroBoardColumnConfiguration : IEntityTypeConfiguration<RetroBoardColumn>
{
    public void Configure(EntityTypeBuilder<RetroBoardColumn> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(c => c.Session)
            .WithMany(s => s.Columns)
            .HasForeignKey(c => c.RetroBoardSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.RetroBoardSessionId).HasDatabaseName("IX_RetroBoardColumn_SessionId");
    }
}
