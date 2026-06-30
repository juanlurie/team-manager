using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class CommentConfiguration : IEntityTypeConfiguration<Comment>
{
    public void Configure(EntityTypeBuilder<Comment> b)
    {
        b.HasKey(c => c.Id);
        b.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");
        b.Property(c => c.EntityType).HasMaxLength(50).IsRequired();
        b.Property(c => c.Text).HasMaxLength(2000).IsRequired();
        b.Property(c => c.AuthorName).HasMaxLength(100);
        b.HasIndex(c => new { c.EntityType, c.EntityId });
    }
}
