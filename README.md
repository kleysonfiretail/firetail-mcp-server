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

## 1. Clone and Install

```bash
# Clone repo
git clone https://github.com/kleysonfiretail/firetail-mcp-server.git
cd firetail-mcp-server

# Install dependencies
npm i
```

## 2. Build the Project

```bash
npm run build
```

## 3 Get FireTail Credentials

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

## 4. Configure Claude Desktop

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
        "FIRETAIL_DEFAULT_ORG_UUID": "your-org-uuid", 
        "FIRETAIL_DEFAULT_PLATFORM_TYPE": "ai" 
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

## 5. Restart Claude Desktop

Completely quit and restart Claude Desktop for the configuration to take effect.

## 6. Usage Examples

Once configured, you can use natural language to interact with the FireTail API:

### 1. **Listing & Searching**

### List all resource policies
```
"List all resource policies"
"Show me all policies"
```

### Search for specific policies
```
"List all resource policies with 'deepseek' in the name"
"Find policies named with 'test'"
"Search for policies containing 'production'"
```

### List suggested policies (premade filters)
```
"List all suggested policies"
"Show me available premade filters"
"What suggested policies are available for AI platform?"
```

### List notification integrations
```
"List all existing integrations"
"Show me Slack integrations"
"Find integrations named with 'email'"
```

### List resource items
```
"List all resource items for AI platform"
"Show me available resources"
```

### 2. **Viewing Policy Details**

### Get specific policy information
```
"Show me details of policy UUID abc-123"
"Get the resource policy with UUID xyz-789"
"Load policy abc-123 with customizations"
```

### 3. **Creating Policies**

### Basic policy creation
```
"Create a new resource policy called 'Production Monitor' with description 'Monitor prod AI usage'"
"Create a policy named 'DeepSeek Alert' using the DeepSeek suggested policy"
```

### Policy with notifications
```
"Create a policy called 'Critical Alerts' using suggested policy 1 and send notifications to Slack UUID abc-123"
"Create 'Team Notifications' policy with multiple Slack channels"
```

### Policy with custom filters
```
"Create a policy with custom filters for specific LLM models"
"Create a policy that monitors OpenAI GPT-4 usage in GitHub"
```

### 4. **Updating Policies**

### Update policy name
```
"Update the resource policy named 'testing' to 'Claude MCP'"
"Rename policy 'old-name' to 'new-name'"
```

### Update policy description
```
"Update the description of policy 'Monitor AI' to 'Track all AI model usage'"
"Change the description for policy UUID abc-123"
```

### Add/remove notifications
```
"Add Slack notification UUID xyz-789 to policy 'Production Monitor'"
"Remove notification from policy 'Test Policy'"
```

### Modify filters
```
"Update policy 'DeepSeek Monitor' to include GitHub and GitLab platforms"
"Add custom filter for GPT-4 models to policy 'AI Tracking'"
```

### 5. **Deleting Policies**

### Delete by name or UUID
```
"Delete the resource policy 'Show and Tell'"
"Delete policy with UUID abc-123"
"Remove the 'testing' policy"
```

### 6. **Complex Workflows**

### Creating comprehensive monitoring
```
"Create a policy that monitors all DeepSeek usage in code repositories and sends alerts to the security team Slack channel"

"Set up a policy to track any AI model usage on cloud platforms, excluding GitHub, and notify via email"
```

### Audit and cleanup
```
"List all policies created by riley@firetail.io"
"Find all disabled policies"
"Show me policies that haven't been updated in the last 30 days"
```

### Bulk operations
```
"Show me all test policies so I can decide which to delete"
"List all policies using the 'Any AI Usage' suggested filter"
```

### 7. **Integration Management**

### Finding the right integration
```
"List all Slack integrations for team notifications"
"Find the Slack channel integration for @user"
"Show me all enabled notification integrations"
```

### Setting up alerts
```
"Create a policy using 'Any AI Usage' and send alerts to all team Slack channels"
"Set up monitoring for DeepSeek with notifications to security@company.com"
```

### 8. **Policy Analysis**

### Understanding configurations
```
"What filters are applied to policy 'Production Monitor'?"
"Show me which notifications are configured for 'DeepSeek Alert'"
"What suggested policies are being used by 'AI Tracking'?"
```

### Compliance and reporting
```
"List all policies monitoring AI usage in code"
"Show me policies that alert on high-risk models"
"Which policies are monitoring platform usage vs code usage?"
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
- **FireTail API**: [Contact FireTail support](https://docs.firetail.ai/docs/organizations/programmatic_access)
- **Claude Desktop**: Visit https://support.claude.com

## Acknowledgments

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/modelcontextprotocol)
- [TypeScript](https://www.typescriptlang.org/)
- [FireTail API](https://docs.firetail.ai/docs/organizations/programmatic_access)
