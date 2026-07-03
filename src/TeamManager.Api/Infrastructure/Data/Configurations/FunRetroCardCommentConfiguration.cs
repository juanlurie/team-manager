using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class FunRetroCardCommentConfiguration : IEntityTypeConfiguration<FunRetroCardComment>
{
    public void Configure(EntityTypeBuilder<FunRetroCardComment> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.HasOne(c => c.Card)
            .WithMany(card => card.Comments)
            .HasForeignKey(c => c.CardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.CardId)
            .HasDatabaseName("IX_FunRetroCardComment_CardId");
    }
}
