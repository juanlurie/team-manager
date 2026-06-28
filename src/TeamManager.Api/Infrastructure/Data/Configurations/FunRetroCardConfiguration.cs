using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroCardConfiguration : IEntityTypeConfiguration<FunRetroCard>
{
    public void Configure(EntityTypeBuilder<FunRetroCard> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(c => c.Session)
            .WithMany(s => s.Cards)
            .HasForeignKey(c => c.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Author)
            .WithMany()
            .HasForeignKey(c => c.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(c => c.SessionId).HasDatabaseName("IX_FunRetroCard_SessionId");
    }
}
