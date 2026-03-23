using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using SimpleECommerceStore.API.Data;
using SimpleECommerceStore.API.Models;
using SimpleECommerceStore.API.Models.DTOs;
using SimpleECommerceStore.API.Services;

namespace SimpleECommerceStore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RefreshTokenCookieName = "se_refreshToken";
    private const string LegacyRefreshTokenCookieName = "refreshToken";
    private const string RefreshTokenMarkerCookieName = "hasRefreshToken";
    private const string RefreshTokenCookiePath = "/api/auth";
    private static readonly TimeSpan RefreshTokenExpiry = TimeSpan.FromDays(7);

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITokenService tokenService,
        ApplicationDbContext db,
        IConfiguration config)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _db = db;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest req)
    {
        var user = new ApplicationUser
        {
            UserName = req.Email,
            Email = req.Email,
            FirstName = req.FirstName,
            LastName = req.LastName
        };
        var result = await _userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        await _userManager.AddToRoleAsync(user, "Customer");
        return await BuildAuthResponseAsync(user);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user == null)
            return Unauthorized("Invalid email or password");

        var result = await _signInManager.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: false);
        if (!result.Succeeded)
            return Unauthorized("Invalid email or password");

        await SetRefreshTokenCookieAsync(user);
        return await BuildAuthResponseAsync(user);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        var cookie = Request.Cookies[RefreshTokenCookieName] ?? Request.Cookies[LegacyRefreshTokenCookieName];
        if (string.IsNullOrEmpty(cookie))
        {
            DeleteRefreshTokenMarkerCookie();
            DeleteLegacyRefreshTokenCookie();
            return Unauthorized("Refresh token missing");
        }

        var parts = cookie.Split(':', 2);
        if (parts.Length != 2)
        {
            DeleteLegacyRefreshTokenCookie();
            return Unauthorized("Invalid refresh token");
        }

        var userId = parts[0];
        var token = parts[1];

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            DeleteRefreshTokenMarkerCookie();
            DeleteLegacyRefreshTokenCookie();
            return Unauthorized("Invalid refresh token");
        }

        var stored = await _tokenService.ValidateRefreshTokenAsync(token, userId);
        if (stored == null)
        {
            DeleteRefreshTokenMarkerCookie();
            DeleteLegacyRefreshTokenCookie();
            return Unauthorized("Invalid or expired refresh token");
        }

        stored.RevokedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await SetRefreshTokenCookieAsync(user);
        return await BuildAuthResponseAsync(user);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var cookie = Request.Cookies[RefreshTokenCookieName] ?? Request.Cookies[LegacyRefreshTokenCookieName];
        if (!string.IsNullOrEmpty(cookie))
        {
            var parts = cookie.Split(':', 2);
            if (parts.Length == 2)
            {
                var userId = parts[0];
                var hash = ComputeSha256Hash(parts[1]);
                var stored = await _db.RefreshTokens
                    .FirstOrDefaultAsync(rt => rt.TokenHash == hash && rt.UserId == userId);
                if (stored != null)
                {
                    stored.RevokedAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
            }
        }

        DeleteRefreshTokenCookie();
        DeleteLegacyRefreshTokenCookie();
        DeleteRefreshTokenMarkerCookie();
        return Ok();
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest req)
    {
        var user = await _userManager.FindByEmailAsync(req.Email);
        if (user == null)
            return Ok();

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = Convert.ToBase64String(Encoding.UTF8.GetBytes(token));
        var resetLink = $"{_config["FrontendBaseUrl"] ?? "http://localhost:5173"}/reset-password?token={Uri.EscapeDataString(encodedToken)}&userId={user.Id}";

        // In production: send email. For dev, return token in response.
        if (_config.GetValue("Auth:ReturnResetTokenInDev", true))
            return Ok(new { resetToken = encodedToken, userId = user.Id });
        return Ok(new { message = "If the email exists, a reset link has been sent." });
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        string token;
        try
        {
            token = Encoding.UTF8.GetString(Convert.FromBase64String(req.Token));
        }
        catch
        {
            return BadRequest("Invalid token");
        }

        var user = await _userManager.FindByIdAsync(req.UserId);
        if (user == null)
            return BadRequest("Invalid token");

        var result = await _userManager.ResetPasswordAsync(user, token, req.NewPassword);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));
        return Ok();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserInfo>> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
            return Unauthorized();
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(new UserInfo(user.Id, user.Email ?? "", user.FirstName, user.LastName, roles.ToList()));
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var accessToken = _tokenService.GenerateAccessToken(user, roles);
        var expiryMinutes = int.Parse(_config["JWT:AccessTokenExpirationMinutes"] ?? "15");
        var expiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes);
        return new AuthResponse(
            accessToken,
            expiresAt,
            new UserInfo(user.Id, user.Email ?? "", user.FirstName, user.LastName, roles.ToList()));
    }

    private async Task SetRefreshTokenCookieAsync(ApplicationUser user)
    {
        var (token, hash, expiresAt) = _tokenService.GenerateRefreshToken();
        _db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAt = expiresAt
        });
        await _db.SaveChangesAsync();

        var cookieValue = $"{user.Id}:{token}";
        Response.Cookies.Append(RefreshTokenCookieName, cookieValue, new CookieOptions
        {
            Path = RefreshTokenCookiePath,
            HttpOnly = true,
            Secure = !HttpContext.Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt
        });
        Response.Cookies.Append(RefreshTokenMarkerCookieName, "1", new CookieOptions
        {
            Path = "/",
            HttpOnly = false,
            Secure = !HttpContext.Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax,
            Expires = expiresAt
        });
    }

    private void DeleteRefreshTokenMarkerCookie()
    {
        Response.Cookies.Delete(RefreshTokenMarkerCookieName, new CookieOptions
        {
            Path = "/",
            HttpOnly = false,
            Secure = !HttpContext.Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax
        });
    }

    private void DeleteRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            Path = RefreshTokenCookiePath,
            HttpOnly = true,
            Secure = !HttpContext.Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax
        });
        // Best-effort cleanup for unexpected path mismatches.
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            Secure = !HttpContext.Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax
        });
    }

    private void DeleteLegacyRefreshTokenCookie()
    {
        Response.Cookies.Delete(LegacyRefreshTokenCookieName, new CookieOptions
        {
            Path = RefreshTokenCookiePath,
            HttpOnly = true,
            Secure = !HttpContext.Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax
        });
        Response.Cookies.Delete(LegacyRefreshTokenCookieName, new CookieOptions
        {
            Path = "/",
            HttpOnly = true,
            Secure = !HttpContext.Request.Host.Host.Contains("localhost"),
            SameSite = SameSiteMode.Lax
        });
    }

    private static string ComputeSha256Hash(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
