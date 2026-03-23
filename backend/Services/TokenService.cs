using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SimpleECommerceStore.API.Data;
using SimpleECommerceStore.API.Models;

namespace SimpleECommerceStore.API.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;
    private readonly ApplicationDbContext _db;

    public TokenService(IConfiguration config, ApplicationDbContext db)
    {
        _config = config;
        _db = db;
    }

    public string GenerateAccessToken(ApplicationUser user, IList<string> roles)
    {
        var secret = _config["JWT:Secret"] ?? throw new InvalidOperationException("JWT:Secret is not configured");
        var issuer = _config["JWT:Issuer"] ?? "SimpleECommerceStore";
        var audience = _config["JWT:Audience"] ?? "SimpleECommerceStore";
        var expiryMinutes = int.Parse(_config["JWT:AccessTokenExpirationMinutes"] ?? "15");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? user.UserName ?? ""),
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Email, user.Email ?? "")
        };
        foreach (var role in roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public (string Token, string Hash, DateTime ExpiresAt) GenerateRefreshToken()
    {
        var days = int.Parse(_config["JWT:RefreshTokenExpirationDays"] ?? "7");
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var token = Convert.ToBase64String(randomBytes);
        var hash = ComputeSha256Hash(token);
        var expiresAt = DateTime.UtcNow.AddDays(days);
        return (token, hash, expiresAt);
    }

    public async Task<RefreshToken?> ValidateRefreshTokenAsync(string token, string userId)
    {
        var hash = ComputeSha256Hash(token);
        var stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt =>
                rt.TokenHash == hash &&
                rt.UserId == userId &&
                rt.RevokedAt == null &&
                rt.ExpiresAt > DateTime.UtcNow);
        return stored;
    }

    private static string ComputeSha256Hash(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
