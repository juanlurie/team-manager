using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class PersonalMapSessionConfiguration : IEntityTypeConfiguration<PersonalMapSession>
{
    public void Configure(EntityTypeBuilder<PersonalMapSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
    }
}
