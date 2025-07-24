# MCP Scratchpad Remote

A reference implementation of a remote MCP (Model Context Protocol) server with Azure AD authentication and enterprise integration patterns.

## Features

- **Azure AD Authentication**: JWT token validation with JWKS key rotation
- **Streamable HTTP Transport**: Full MCP protocol support over HTTP
- **Session Management**: Per-session, per-user, and global storage scopes
- **Enterprise Ready**: Docker containerization, CI/CD, and cloud deployment
- **Developer Experience**: Hot reload, tunneling support, comprehensive logging

## API Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `POST /mcp` | POST | MCP protocol endpoint | ✅ |
| `DELETE /mcp` | DELETE | End MCP session | ✅ |
| `GET /.well-known/oauth-protected-resource` | GET | OAuth resource metadata | ❌ |
| `GET /healthz` | GET | Health check | ❌ |

## MCP Tools

### `append(text, scope)`
Appends text to a scoped scratchpad buffer.

**Parameters:**
- `text` (string): Text to append
- `scope` (enum): Storage scope - `"session"`, `"user"`, or `"global"`

### `get(scope)`
Retrieves the complete content of a scoped scratchpad buffer.

**Parameters:**
- `scope` (enum): Storage scope - `"session"`, `"user"`, or `"global"`

### `clear(scope)`
Clears the content of a scoped scratchpad buffer.

**Parameters:**
- `scope` (enum): Storage scope - `"session"`, `"user"`, or `"global"`

## Storage Scopes

- **Session**: Data tied to the current MCP session (expires when session ends)
- **User**: Data tied to the authenticated user (persists across sessions)
- **Global**: Data shared across all users (persists globally)

## Prerequisites

- **Node.js** 20+ 
- **Azure AD App Registration** with API permissions
- **Docker** (for containerization)
- **Azure CLI** (for deployment)

## Azure AD Setup

### 1. Create App Registration

```bash
az ad app create \
  --display-name "MCP Scratchpad" \
  --identifier-uris "api://scratchpad-mcp" \
  --sign-in-audience "AzureADMyOrg"
```

### 2. Configure API Permissions

```bash
# Add Microsoft Graph User.Read permission
az ad app permission add \
  --id <app-id> \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope

# Grant admin consent
az ad app permission admin-consent --id <app-id>
```

### 3. Configure Scopes

In the Azure Portal:
1. Go to **App registrations** → Your app → **Expose an API**
2. Add scopes: `mcp.read`, `mcp.write`
3. Set redirect URIs for your client applications

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port | `3000` |
| `APP_BASE_URL` | Yes | Public base URL | `https://mcp-scratchpad.example.com` |
| `AZURE_TENANT_ID` | Yes | Azure AD tenant ID | `72f988bf-86f1-41af-91ab-2d7cd011db47` |
| `AZURE_AUDIENCE` | Yes | App registration URI | `api://scratchpad-mcp` |
| `AZURE_ALLOWED_SCOPES` | Yes | Space-separated scopes | `mcp.read mcp.write` |
| `LOG_LEVEL` | No | Logging level | `info` |
| `TUNNEL_HOSTNAME` | No | Dev tunnel hostname | `mcp-dev.example.com` |
| `SESSION_TTL_MIN` | No | Session timeout (minutes) | `30` |

## Local Development

### Install Dependencies

```bash
npm install
```

### Start Development Server

```bash
# Basic development
npm run dev

# Development with tunnel (requires cloudflared)
npm run dev:tunnel
```

### Build for Production

```bash
npm run build
npm start
```

## Docker Deployment

### Build and Run Locally

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

### Docker Compose

```bash
docker compose up -d
```

## Azure Container Apps Deployment

### Prerequisites

1. **Azure Container Registry**:
```bash
az acr create \
  --resource-group myResourceGroup \
  --name mcpscratchpad \
  --sku Basic
```

2. **Container Apps Environment**:
```bash
az containerapp env create \
  --name mcp-environment \
  --resource-group myResourceGroup \
  --location eastus
```

### Deploy via GitHub Actions

1. **Configure Secrets** in your GitHub repository:
   - `AZURE_CREDENTIALS`: Service principal JSON
   - `AZURE_CLIENT_ID`: ACR username
   - `AZURE_CLIENT_SECRET`: ACR password
   - `AZURE_RESOURCE_GROUP`: Resource group name
   - `AZURE_CONTAINER_ENV`: Container Apps environment name
   - Environment variables (see table above)

2. **Push to main branch** - CI/CD will automatically deploy

### Manual Deployment

```bash
# Build and push image
docker build -t mcpscratchpad.azurecr.io/mcp-scratchpad:latest .
docker push mcpscratchpad.azurecr.io/mcp-scratchpad:latest

# Deploy to Container Apps
az containerapp up \
  --resource-group myResourceGroup \
  --name mcp-scratchpad \
  --image mcpscratchpad.azurecr.io/mcp-scratchpad:latest \
  --environment mcp-environment \
  --ingress external \
  --target-port 3000 \
  --env-vars "PORT=3000" "APP_BASE_URL=https://your-domain.com" # ... other vars
```

## Client Integration

### Register with MCP Client

```json
{
  "transport": {
    "type": "http",
    "url": "https://your-mcp-server.com/mcp",
    "headers": {
      "Authorization": "Bearer <azure-ad-token>"
    }
  }
}
```

### Authentication Flow

1. **Obtain Azure AD Token**:
   ```javascript
   const token = await acquireTokenSilent({
     scopes: ["api://scratchpad-mcp/mcp.read", "api://scratchpad-mcp/mcp.write"],
     account: account
   });
   ```

2. **Connect to MCP Server**:
   ```javascript
   const client = new MCPClient({
     transport: {
       type: "http",
       url: "https://your-server.com/mcp",
       headers: {
         "Authorization": `Bearer ${token.accessToken}`
       }
     }
   });
   ```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run linter
npm run lint
```

## Monitoring & Logging

The application uses structured logging with Winston. In production:

- Logs are written to stdout in JSON format
- Use Azure Monitor or similar for log aggregation
- Health checks available at `/healthz`

## Security Considerations

- **Token Validation**: Full JWT signature verification with JWKS rotation
- **CORS**: Configurable origin restrictions  
- **Headers**: Security headers via Helmet.js
- **Container**: Runs as non-root user
- **Dependencies**: Regular security updates via Dependabot

## License

MIT
