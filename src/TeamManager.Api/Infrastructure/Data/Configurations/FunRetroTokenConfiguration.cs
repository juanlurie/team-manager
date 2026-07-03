using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroTokenConfiguration : IEntityTypeConfiguration<FunRetroToken>
{
    public void Configure(EntityTypeBuilder<FunRetroToken> builder)
    {
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(t => t.Session)
            .WithMany(s => s.Tokens)
            .HasForeignKey(t => t.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(t => t.SessionId).HasDatabaseName("IX_FunRetroToken_SessionId");
    }
}
