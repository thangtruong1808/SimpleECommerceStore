using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SimpleECommerceStore.API.Data;
using SimpleECommerceStore.API.Models;
using SimpleECommerceStore.API.Services;
using MySqlConnector;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var rawConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
var connectionString = NormalizeMySqlConnectionString(rawConnectionString);
var hasTemplateDbPassword = !string.IsNullOrEmpty(connectionString) &&
                            connectionString.Contains("Password=your_password", StringComparison.OrdinalIgnoreCase);
if (!string.IsNullOrEmpty(connectionString))
{
    // Avoid eager DB connection at startup via AutoDetect, which crashes immediately
    // when local DB credentials are not configured yet.
    var configuredVersion = Environment.GetEnvironmentVariable("MYSQL_SERVER_VERSION");
    var mysqlVersion = Version.TryParse(configuredVersion, out var parsedVersion)
        ? parsedVersion
        : new Version(8, 0, 36);

    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseMySql(connectionString, new MySqlServerVersion(mysqlVersion)));
}

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

var jwtSecret = builder.Configuration["JWT:Secret"] ?? Environment.GetEnvironmentVariable("JWT__Secret") ?? "fallback-secret-min-32-chars-for-hs256";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["JWT:Issuer"] ?? "SimpleECommerceStore",
        ValidAudience = builder.Configuration["JWT:Audience"] ?? "SimpleECommerceStore",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

builder.Services.AddAuthorization();
builder.Services.AddScoped<ITokenService, TokenService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    if (hasTemplateDbPassword)
    {
        app.Logger.LogWarning("Role seed skipped. Set a real DB password in backend/.env.");
    }
    else
    {
        try
        {
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            foreach (var roleName in new[] { "Customer", "Admin" })
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                    await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }
        catch
        {
            app.Logger.LogWarning("Role seed skipped. Check database connection settings.");
        }
    }
}

app.Run();

static string? NormalizeMySqlConnectionString(string? raw)
{
    if (string.IsNullOrWhiteSpace(raw))
        return raw;

    // Support shorthand env format: host,port,user,password,database;
    if (!raw.Contains('='))
    {
        var parts = raw.Trim().TrimEnd(';').Split(',', StringSplitOptions.TrimEntries);
        if (parts.Length == 5)
        {
            var builder = new MySqlConnectionStringBuilder
            {
                Server = parts[0],
                Port = uint.TryParse(parts[1], out var parsedPort) ? parsedPort : 3306u,
                UserID = parts[2],
                Password = parts[3],
                Database = parts[4]
            };
            return builder.ConnectionString;
        }
    }

    return raw;
}
