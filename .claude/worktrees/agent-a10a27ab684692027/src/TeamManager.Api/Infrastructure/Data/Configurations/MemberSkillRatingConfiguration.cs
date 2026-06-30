using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class MemberSkillRatingConfiguration : IEntityTypeConfiguration<MemberSkillRating>
{
    public void Configure(EntityTypeBuilder<MemberSkillRating> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).HasDefaultValueSql("gen_random_uuid()");
    }
}
