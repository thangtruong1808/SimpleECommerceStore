using SimpleECommerceStore.API.Models;

namespace SimpleECommerceStore.API.Services;

public interface ITokenService
{
    string GenerateAccessToken(ApplicationUser user, IList<string> roles);
    (string Token, string Hash, DateTime ExpiresAt) GenerateRefreshToken();
    Task<RefreshToken?> ValidateRefreshTokenAsync(string token, string userId);
}
