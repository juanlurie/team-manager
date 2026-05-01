using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TeamManager.Api.Infrastructure.Data;

#nullable disable

namespace TeamManager.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260426100000_AddInvitationAndRole")]
partial class AddInvitationAndRole
{
    protected override void BuildTargetModel(ModelBuilder modelBuilder) { }
}
