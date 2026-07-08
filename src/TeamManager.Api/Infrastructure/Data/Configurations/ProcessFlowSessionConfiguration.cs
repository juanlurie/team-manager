using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Domain.Entities;

namespace TeamManager.Api.Infrastructure.Data.Configurations;

public class ProcessFlowSessionConfiguration : IEntityTypeConfiguration<ProcessFlowSession>
{
    public void Configure(EntityTypeBuilder<ProcessFlowSession> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasDefaultValueSql("gen_random_uuid()");
    }
}
