using TeamManager.Api.Middleware;
using Microsoft.AspNetCore.Mvc;
using TeamManager.Api.Application.DTOs.Milestone;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Presentation.Controllers;

[ApiController]
[RequireFeature("features")]
[Route("api/v1/pis/{piId:guid}/milestones")]
public class PIMilestonesController(IMilestoneService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(Guid piId)
        => Ok(await service.GetByPIAsync(piId));

    [HttpPost]
    public async Task<IActionResult> Create(Guid piId, [FromBody] CreateMilestoneRequest request)
    {
        var result = await service.CreateAsync(piId, request);
        return CreatedAtAction(nameof(MilestonesController.GetById), "Milestones", new { id = result.Id }, result);
    }
}

[ApiController]
[Route("api/v1/milestones/{id:guid}")]
public class MilestonesController(IMilestoneService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await service.GetByIdAsync(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMilestoneRequest request)
    {
        var result = await service.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }

    [HttpGet("criteria")]
    public async Task<IActionResult> GetCriteria(Guid id)
        => Ok(await service.GetCriteriaAsync(id));

    [HttpPost("criteria")]
    public async Task<IActionResult> AddCriterion(Guid id, [FromBody] CreateMilestoneCriterionRequest request)
    {
        var result = await service.AddCriterionAsync(id, request);
        return Created("", result);
    }
}

[ApiController]
[Route("api/v1/criteria/{id:guid}")]
public class CriteriaController(IMilestoneService service) : ControllerBase
{
    [HttpPut]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateMilestoneCriterionRequest request)
    {
        var result = await service.UpdateCriterionAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await service.DeleteCriterionAsync(id);
        return success ? NoContent() : NotFound();
    }
}
