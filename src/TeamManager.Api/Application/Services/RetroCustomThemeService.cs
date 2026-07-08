using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.FunRetro;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

// Team-wide library of custom retro board themes -- unlike the old per-session upload, a theme
// here is created once and can be picked from any retro's theme picker, same as the fixed
// built-in themes. Any member with retro access can create/rename/delete a theme or its variant
// images; there's no per-theme ownership check, since it's meant to be a shared, editable library
// rather than something only its creator can touch.
public class RetroCustomThemeService(AppDbContext db)
{
    public static readonly HashSet<string> AllowedContentTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    public const long MaxImageBytes = 5 * 1024 * 1024;
    public static readonly HashSet<string> ValidBuiltInIds = ["space", "f1", "ocean", "retro-gaming"];

    // Variant used to be restricted to the 3 legacy tone names ("positive"/"negative"/"action");
    // it's now also used for arbitrary template column keys ("well", "start", "wind", ...), so the
    // check is a generic safe-string format (it's a URL path segment and a DB PK component) rather
    // than a hardcoded whitelist -- the frontend owns the actual column-key vocabulary.
    private static readonly Regex ValidVariantPattern = new("^[a-z0-9-]{1,40}$", RegexOptions.Compiled);
    public static bool IsValidVariant(string variant) => ValidVariantPattern.IsMatch(variant);

    public async Task<List<RetroCustomThemeDto>> GetThemesAsync()
    {
        var themes = await db.RetroCustomThemes
            .Include(t => t.Images)
            .OrderBy(t => t.CreatedAt)
            .ToListAsync();

        return themes.Select(ToDto).ToList();
    }

    public async Task<RetroCustomThemeDto> CreateThemeAsync(Guid memberId, string name)
    {
        var theme = new RetroCustomTheme
        {
            Name = string.IsNullOrWhiteSpace(name) ? "Untitled Theme" : name.Trim(),
            CreatedByMemberId = memberId,
        };
        db.RetroCustomThemes.Add(theme);
        await db.SaveChangesAsync();
        return ToDto(theme);
    }

    public async Task<bool> RenameThemeAsync(Guid themeId, string name)
    {
        var theme = await db.RetroCustomThemes.FindAsync(themeId);
        if (theme is null || string.IsNullOrWhiteSpace(name)) return false;

        theme.Name = name.Trim();
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteThemeAsync(Guid themeId)
    {
        var theme = await db.RetroCustomThemes.FindAsync(themeId);
        if (theme is null) return false;

        db.RetroCustomThemes.Remove(theme);
        await db.SaveChangesAsync();
        // Sessions with Theme == themeId.ToString() are left as-is (no cascade/cleanup) -- the
        // theme picker/canvas simply won't find a match for a deleted theme id and renders no
        // background, the same degrade-gracefully behavior as any other unrecognized theme value.
        return true;
    }

    public async Task<(bool Success, bool Conflict)> SetOverrideBuiltInAsync(Guid themeId, string? builtInId)
    {
        var theme = await db.RetroCustomThemes.FindAsync(themeId);
        if (theme is null) return (false, false);
        if (builtInId is not null)
        {
            if (!ValidBuiltInIds.Contains(builtInId)) return (false, false);
            var claimedByAnother = await db.RetroCustomThemes
                .AnyAsync(t => t.Id != themeId && t.OverridesBuiltInId == builtInId);
            if (claimedByAnother) return (false, true);
        }

        theme.OverridesBuiltInId = builtInId;
        await db.SaveChangesAsync();
        return (true, false);
    }

    /// <summary>Caller (the controller) is expected to have already validated content type/size
    /// against AllowedContentTypes/MaxImageBytes and that variant is a valid format (IsValidVariant).</summary>
    public async Task<DateTimeOffset?> UploadVariantImageAsync(Guid themeId, string variant, string contentType, Stream content)
    {
        var theme = await db.RetroCustomThemes.FindAsync(themeId);
        if (theme is null) return null;

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms);
        var bytes = ms.ToArray();

        var image = await db.RetroCustomThemeImages.FindAsync(themeId, variant);
        var now = DateTimeOffset.UtcNow;
        if (image is null)
        {
            image = new RetroCustomThemeImage { ThemeId = themeId, Variant = variant };
            db.RetroCustomThemeImages.Add(image);
        }
        image.Data = bytes;
        image.ContentType = contentType;
        image.UpdatedAt = now;
        await db.SaveChangesAsync();
        return now;
    }

    public async Task<(byte[] Data, string ContentType)?> GetVariantImageAsync(Guid themeId, string variant)
    {
        var image = await db.RetroCustomThemeImages.FindAsync(themeId, variant);
        return image is null ? null : (image.Data, image.ContentType);
    }

    public async Task<bool> DeleteVariantImageAsync(Guid themeId, string variant)
    {
        var image = await db.RetroCustomThemeImages.FindAsync(themeId, variant);
        if (image is null) return false;

        db.RetroCustomThemeImages.Remove(image);
        await db.SaveChangesAsync();
        return true;
    }

    private static RetroCustomThemeDto ToDto(RetroCustomTheme theme) => new()
    {
        Id = theme.Id,
        Name = theme.Name,
        CreatedByMemberId = theme.CreatedByMemberId,
        CreatedAt = theme.CreatedAt,
        Variants = theme.Images.ToDictionary(i => i.Variant, i => i.UpdatedAt),
        OverridesBuiltInId = theme.OverridesBuiltInId,
    };
}
