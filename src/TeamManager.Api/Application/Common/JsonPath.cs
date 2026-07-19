using System.Text.Json;

namespace TeamManager.Api.Application.Common;

/// <summary>
/// Reads a string out of a JSON document by a dotted path, supporting <c>field[N]</c> and bare
/// numeric-index segments (e.g. <c>choices[0].message.content</c>, <c>data.1.text</c>). Used to pull
/// the generated text out of arbitrary AI-provider response shapes.
/// </summary>
public static class JsonPath
{
    /// <summary>Returns the string at <paramref name="dotPath"/>, or null if the path is missing,
    /// malformed, or points at a non-string value. Never throws.</summary>
    public static string? ExtractText(string json, string dotPath)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var current = doc.RootElement;
            foreach (var seg in dotPath.Split('.'))
            {
                if (int.TryParse(seg, out var idx))
                {
                    current = current[idx];
                }
                else if (seg.Contains('['))
                {
                    // Handle field[N] notation e.g. content[0], choices[0]
                    var bracket = seg.IndexOf('[');
                    var propName = seg[..bracket];
                    var indexStr = seg[(bracket + 1)..seg.IndexOf(']')];
                    if (!current.TryGetProperty(propName, out var arr)) return null;
                    if (!int.TryParse(indexStr, out var arrIdx)) return null;
                    current = arr[arrIdx];
                }
                else if (current.TryGetProperty(seg, out var next))
                {
                    current = next;
                }
                else return null;
            }
            return current.ValueKind == JsonValueKind.String ? current.GetString() : null;
        }
        catch { return null; }
    }
}
