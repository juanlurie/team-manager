using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeamManager.Api.Core.Models;

namespace TeamManager.Api.Infrastructure.Data.Configurations
{
    public class InvitationConfiguration : IEntityTypeConfiguration<Invitation>
    {
        public void Configure(EntityTypeBuilder<Invitation> builder)
        {
            builder.ToTable("Invitations");
            builder.HasKey(i => i.Id);
            
            builder.Property(i => i.Email)
                .IsRequired()
                .HasMaxLength(256);
                
            builder.Property(i => i.Role)
                .IsRequired();
                
            builder.Property(i => i.SentAt)
                .IsRequired();
                
            builder.Property(i => i.AcceptedAt)
                .IsRequired(false);
                
            builder.Property(i => i.ExternalSubjectId)
                .IsRequired(false)
                .HasMaxLength(256);
                
            builder.HasIndex(i => i.Email)
                .IsUnique();
        }
    }
}
