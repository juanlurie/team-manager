using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.Services;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[Route("api/v1/progress")]
public class ProgressController(ProgressService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await service.GetAllAsync());
}
