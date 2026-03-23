using System.ComponentModel.DataAnnotations;

namespace SimpleECommerceStore.API.Models.DTOs;

public record RegisterRequest(
    [Required][EmailAddress] string Email,
    [Required][MinLength(6)] string Password,
    string? FirstName,
    string? LastName);

public record LoginRequest(
    [Required][EmailAddress] string Email,
    [Required] string Password);

public record ForgotPasswordRequest(
    [Required][EmailAddress] string Email);

public record ResetPasswordRequest(
    [Required] string Token,
    [Required] string UserId,
    [Required][MinLength(6)] string NewPassword);

public record AuthResponse(
    string AccessToken,
    DateTime ExpiresAt,
    UserInfo User);

public record UserInfo(
    string Id,
    string Email,
    string? FirstName,
    string? LastName,
    IList<string> Roles);
