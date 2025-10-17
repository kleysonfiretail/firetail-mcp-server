# FireTail Resource Policy MCP Server

A Model Context Protocol (MCP) server that provides Claude Desktop with direct access to the FireTail Resource Policy API. This enables AI-assisted management of resource policies, filters, and alert configurations through natural language.

## Features

- 🔐 **OAuth2 Authentication** - Automatic token management with client credentials flow
- 🔄 **Auto Token Refresh** - Handles token expiration seamlessly
- 🛠️ **8 Core Tools** - Full CRUD operations for resource policies
- 📝 **TypeScript** - Full type safety with comprehensive type definitions
- 🌍 **Multi-Region** - Support for EU and US endpoints
- ⚡ **Production Ready** - Error handling, retry logic, and logging

## Tools Available

| Tool | Description |
|------|-------------|
| `list_resource_policies` | List all resource policies for an organisation |
| `list_premade_filters` | List all premade filters for an organisation |
| `list_resource_items` | List all resource items for an organisation |
| `list_existing_integrations_for_policy` | List all existing notification integrations for an organisation |
| `create_resource_policy` | Create a new resource policy |
| `get_resource_policy` | Get a resource policy by UUID |
| `update_resource_policy` | Update an existing resource policy |
| `delete_resource_policy` | Delete a resource policy |

## Prerequisites

- Node.js 18+ (with native fetch support)
- Claude Desktop application
- FireTail OAuth2 credentials (client ID and secret)
- Your FireTail organisation UUID

## Quick Start

### 1. Clone and Install

```bash
# Clone repo
git clone https://github.com/kleysonfiretail/firetail-mcp-server.git
cd firetail-mcp-server

# Install dependencies
npm i
```

### 2. Build the Project

```bash
npm run build
```

### 3 Get FireTail Credentials

[Obtain your OAuth2 credentials](https://docs.firetail.ai/docs/organizations/programmatic_access) from FireTail:
- **CLIENT_ID**: Your OAuth2 client ID
- **CLIENT_SECRET**: Your OAuth2 client secret

Test your credentials:

```bash
curl -X POST https://api.saas.eu-west-1.prod.firetail.app \
  -d grant_type=client_credentials \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

### 4. Configure Claude Desktop

Edit Claude Desktop's config file:

**MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "firetail-resource-policy": {
      "command": "node",
      "args": ["/absolute/path/to/firetail-mcp-server/dist/index.js"],
      "env": {
        "FIRETAIL_API_URL": "https://api.saas.eu-west-1.prod.firetail.app",
        "FIRETAIL_CLIENT_ID": "your-client-id-here",
        "FIRETAIL_CLIENT_SECRET": "your-client-secret-here",
        "FIRETAIL_DEFAULT_ORG_UUID": "your-org-uuid", // OPTIONAL
        "FIRETAIL_DEFAULT_PLATFORM_TYPE": "ai" // OPTIONAL
      }
    }
  }
}
```

**Important:** Use the absolute path to your `dist/index.js` file!

#### Region Configuration

**EU (default):**
```json
"FIRETAIL_API_URL": "https://api.saas.eu-west-1.prod.firetail.app"
```

**US:**
```json
"FIRETAIL_API_URL": "https://api.saas.us-east-2.prod.us.firetail.app"
```

### 5. Restart Claude Desktop

Completely quit and restart Claude Desktop for the configuration to take effect.

## Usage Examples

Once configured, you can use natural language to interact with the FireTail API:

### List Filters
```
"List all premade filters for organisation abc-123 on the api platform"
```

### View Resources
```
"Show me all resource items for my organisation xyz-456"
```

### Create Policy
```
"Create a new resource policy named 'Production Monitor' for the api platform"
```

### Get Policy Details
```
"Get details for resource policy def-789"
```

### Update Policy
```
"Update resource policy def-789 to change the description"
```

### Delete Policy
```
"Delete resource policy def-789"
```

## Project Structure

```
firetail-mcp-server/
├── src/
│   └── index.ts           # Main MCP server code
├── dist/                  # Compiled JavaScript (generated)
│   └── index.js
├── package.json           # Project configuration
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## Development

### Run in Development Mode

```bash
npm run dev
```

### Type Checking

```bash
npx tsc --noEmit
```

### Build for Production

```bash
npm run build
```

### View Logs

**MacOS:**
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Windows:**
```powershell
Get-Content "$env:APPDATA\Claude\logs\mcp*.log" -Wait
```

## Troubleshooting

### Server Not Appearing

**Check:**
- Configuration file is valid JSON
- Absolute path is correct
- Claude Desktop was fully restarted
- Build succeeded (`dist/index.js` exists)

### Authentication Errors

**Verify:**
- CLIENT_ID and CLIENT_SECRET are correct
- Credentials haven't expired
- You have access to the organisation
- API URL matches your region

**Test manually:**
```bash
curl -X POST https://api.saas.eu-west-1.prod.firetail.app \
  -d grant_type=client_credentials \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET
```

## Security Best Practices

✅ **Never commit credentials** to version control  
✅ **Use environment variables** for sensitive data  
✅ **Rotate credentials regularly**  
✅ **Limit credential permissions** to required scope  
✅ **Monitor API usage** through FireTail dashboard  
✅ **Keep dependencies updated** for security patches

### Using Environment Variables

Create a `.env` file (don't commit this):

```bash
FIRETAIL_API_URL=https://api.saas.eu-west-1.prod.firetail.app
FIRETAIL_CLIENT_ID=your-client-id
FIRETAIL_CLIENT_SECRET=your-client-secret
FIRETAIL_DEFAULT_ORG_UUID=your-org-uuid
FIRETAIL_DEFAULT_PLATFORM_TYPE=ai
```

### Endpoints

All API endpoints are documented in the FireTail OpenAPI specification. The server provides MCP tools that map to these endpoints:

- `/organisations/{org_uuid}/resource-policies/filters`
- `/organisations/{org_uuid}/resource-policies/resources`
- `/organisations/{org_uuid}/resource-policies`
- `/organisations/{org_uuid}/resource-policies/{resource_policy_uuid}`
- `/organisations/{org_uuid}/search`

## Support

For issues with:
- **This MCP Server**: Open an issue on GitHub
- **FireTail API**: Contact FireTail support
- **Claude Desktop**: Visit https://support.claude.com

## Acknowledgments

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/modelcontextprotocol)
- [TypeScript](https://www.typescriptlang.org/)
- [FireTail API](https://docs.firetail.ai/docs/organizations/programmatic_access)
