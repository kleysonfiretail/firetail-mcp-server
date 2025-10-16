#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Types based on OpenAPI spec
interface AlertConfig {
  UUID: string;
  notificationIntegrations: string[];
  minimumResources: 1;
}

interface Filter {
  field: string;
  values?: string[];
  value?: string;
  kv_values?: Array<{ k: string; v: string }>;
  operator:
    | "is-one-of"
    | "is-not-one-of"
    | "greater-than"
    | "less-than"
    | "is-one-of-kv"
    | "is-not-one-of-kv"
    | "is-one-of-prefix"
    | "is-not-one-of-prefix";
}

interface ResourceFilter {
  UUID: string;
  resource: string;
  filters: Filter[];
}

interface CreateResourcePolicyPayload {
  name: string;
  description?: string;
  platformType: "api" | "ai";
  alertConfigs: AlertConfig[];
  savedFilterUUIDs: string[];
  filters: ResourceFilter[];
  premadeFilterUUIDs: string[];
}

interface UpdateResourcePolicyPayload {
  name?: string;
  description?: string;
  alertConfigs?: AlertConfig[];
  savedFilterUUIDs?: string[];
  filters?: ResourceFilter[];
  premadeFilterUUIDs?: string[];
}

interface ResourcePolicy {
  UUID: string;
  status: string;
  g_orgUUID: string;
  dateAddedInMicroSeconds: number;
  name: string;
  description?: string;
  alertConfigs: AlertConfig[];
  savedFilterUUIDs: string[];
  filters: ResourceFilter[];
  premadeFilterUUIDs: string[];
  dateModifiedInMicroSeconds?: number;
  platformType: "api" | "ai";
  itemType: string;
  indexName: string;
  createdBy: string;
}

// Configuration
const API_BASE_URL = process.env.FIRETAIL_API_URL || "";
const CLIENT_ID = process.env.FIRETAIL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.FIRETAIL_CLIENT_SECRET || "";

// Token management
let accessToken: string | null = null;
let tokenExpiry: number = 0;

// Create MCP Server
const server = new Server(
  {
    name: "firetail-resource-policy-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools: Tool[] = [
    {
      name: "list_premade_filters",
      description: "List all premade filters for an organisation",
      inputSchema: {
        type: "object",
        properties: {
          org_uuid: {
            type: "string",
            description: "Organisation UUID",
          },
          platform: {
            type: "string",
            enum: ["api", "ai"],
            description: "Platform type (api or ai)",
          },
        },
        required: ["org_uuid", "platform"],
      },
    },
    {
      name: "list_resource_items",
      description: "List all resource items for an organisation",
      inputSchema: {
        type: "object",
        properties: {
          org_uuid: {
            type: "string",
            description: "Organisation UUID",
          },
          platform: {
            type: "string",
            enum: ["api", "ai"],
            description: "Platform type (api or ai)",
          },
        },
        required: ["org_uuid", "platform"],
      },
    },
    {
      name: "create_resource_policy",
      description: "Create a new resource policy",
      inputSchema: {
        type: "object",
        properties: {
          org_uuid: {
            type: "string",
            description: "Organisation UUID",
          },
          name: {
            type: "string",
            description: "Policy name (max 128 characters)",
          },
          description: {
            type: "string",
            description: "Policy description (max 128 characters)",
          },
          platformType: {
            type: "string",
            enum: ["api", "ai"],
            description: "Platform type",
          },
          alertConfigs: {
            type: "array",
            description: "Alert configurations",
          },
          savedFilterUUIDs: {
            type: "array",
            description: "Array of saved filter UUIDs",
          },
          filters: {
            type: "array",
            description: "Array of resource filters",
          },
          premadeFilterUUIDs: {
            type: "array",
            description: "Array of premade filter UUIDs",
          },
        },
        required: [
          "org_uuid",
          "name",
          "platformType",
          "alertConfigs",
          "savedFilterUUIDs",
          "filters",
          "premadeFilterUUIDs",
        ],
      },
    },
    {
      name: "get_resource_policy",
      description: "Get a resource policy by UUID",
      inputSchema: {
        type: "object",
        properties: {
          org_uuid: {
            type: "string",
            description: "Organisation UUID",
          },
          resource_policy_uuid: {
            type: "string",
            description: "Resource Policy UUID",
          },
          load_customizations: {
            type: "boolean",
            description: "Load customizations (default: false)",
          },
        },
        required: ["org_uuid", "resource_policy_uuid"],
      },
    },
    {
      name: "update_resource_policy",
      description: "Update an existing resource policy",
      inputSchema: {
        type: "object",
        properties: {
          org_uuid: {
            type: "string",
            description: "Organisation UUID",
          },
          resource_policy_uuid: {
            type: "string",
            description: "Resource Policy UUID",
          },
          name: {
            type: "string",
            description: "Policy name (max 128 characters)",
          },
          description: {
            type: "string",
            description: "Policy description (max 128 characters)",
          },
          alertConfigs: {
            type: "array",
            description: "Alert configurations",
          },
          savedFilterUUIDs: {
            type: "array",
            description: "Array of saved filter UUIDs",
          },
          filters: {
            type: "array",
            description: "Array of resource filters",
          },
          premadeFilterUUIDs: {
            type: "array",
            description: "Array of premade filter UUIDs",
          },
        },
        required: ["org_uuid", "resource_policy_uuid"],
      },
    },
    {
      name: "delete_resource_policy",
      description: "Delete a resource policy",
      inputSchema: {
        type: "object",
        properties: {
          org_uuid: {
            type: "string",
            description: "Organisation UUID",
          },
          resource_policy_uuid: {
            type: "string",
            description: "Resource Policy UUID",
          },
        },
        required: ["org_uuid", "resource_policy_uuid"],
      },
    },
  ];

  return { tools };
});

// Handler for tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Missing arguments",
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case "list_premade_filters":
        return await listPremadeFilters(
          args.org_uuid as string,
          args.platform as "api" | "ai"
        );

      case "list_resource_items":
        return await listResourceItems(
          args.org_uuid as string,
          args.platform as "api" | "ai"
        );

      case "create_resource_policy":
        return await createResourcePolicy(args as any);

      case "get_resource_policy":
        return await getResourcePolicy(
          args.org_uuid as string,
          args.resource_policy_uuid as string,
          args.load_customizations as boolean | undefined
        );

      case "update_resource_policy":
        return await updateResourcePolicy(args as any);

      case "delete_resource_policy":
        return await deleteResourcePolicy(
          args.org_uuid as string,
          args.resource_policy_uuid as string
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// API Functions

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60 second buffer)
  if (accessToken && Date.now() < tokenExpiry - 60000) {
    return accessToken;
  }

  console.error("Fetching new access token...");

  const response = await fetch(API_BASE_URL + "/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get access token: HTTP ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();

  if (!data || typeof data !== "object" || !("access_token" in data)) {
    throw new Error("No access token in response");
  }

  accessToken = (data as any).access_token;

  // Set token expiry (default to 3600 seconds if not provided)
  const expiresIn = (data as any).expires_in || 3600;
  tokenExpiry = Date.now() + expiresIn * 1000;

  console.error(`Access token obtained, expires in ${expiresIn} seconds`);

  if (!accessToken) {
    throw new Error("Failed to obtain access token");
  }

  return accessToken;
}

async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // If unauthorized, token might be expired, retry once with new token
  if (response.status === 401) {
    console.error("Token expired, fetching new token...");
    accessToken = null; // Invalidate cached token
    const newToken = await getAccessToken();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  return response;
}

async function listPremadeFilters(orgUuid: string, platform: "api" | "ai") {
  const url = `${API_BASE_URL}/organisations/${orgUuid}/resource-policies/filters?platform=${platform}`;

  const response = await makeAuthenticatedRequest(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function listResourceItems(orgUuid: string, platform: "api" | "ai") {
  const url = `${API_BASE_URL}/organisations/${orgUuid}/resource-policies/resources?platform=${platform}`;

  const response = await makeAuthenticatedRequest(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function createResourcePolicy(args: {
  org_uuid: string;
  name: string;
  description?: string;
  platformType: "api" | "ai";
  alertConfigs: string[];
  savedFilterUUIDs: string[];
  filters: ResourceFilter[];
  premadeFilterUUIDs: string[];
}) {
  const url = `${API_BASE_URL}/organisations/${args.org_uuid}/resource-policies`;

  const payload: CreateResourcePolicyPayload = {
    name: args.name,
    platformType: args.platformType,
    alertConfigs: [
      {
        UUID: crypto.randomUUID(),
        notificationIntegrations: args.alertConfigs.map((uuid) => uuid),
        minimumResources: 1,
      },
    ],
    savedFilterUUIDs: args.savedFilterUUIDs,
    filters: args.filters,
    premadeFilterUUIDs: args.premadeFilterUUIDs,
  };

  const x = {
    savedFilterUUIDs: [],
    premadeFilterUUIDs: ["b1c2d3e4-f5a6-4890-abcd-ef1234567890"],
    platformType: "ai",
    name: "testing",
    description: "descrption",
    filters: [],
    alertConfigs: [
      {
        notificationIntegrations: ["b4c58102-290c-447d-9ee5-19be0a9cff01"],
        UUID: "a0630cbd-290c-4aa1-9eb4-c5593754ec59",
        minimumResources: 1,
      },
    ],
  };

  if (args.description) {
    payload.description = args.description;
  }

  const response = await makeAuthenticatedRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ResourcePolicy;

  return {
    content: [
      {
        type: "text",
        text: `Resource policy created successfully:\n${JSON.stringify(
          data,
          null,
          2
        )}`,
      },
    ],
  };
}

async function getResourcePolicy(
  orgUuid: string,
  resourcePolicyUuid: string,
  loadCustomizations: boolean = false
) {
  const url = `${API_BASE_URL}/organisations/${orgUuid}/resource-policies/${resourcePolicyUuid}?load_customizations=${loadCustomizations}`;

  const response = await makeAuthenticatedRequest(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ResourcePolicy;

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function updateResourcePolicy(args: {
  org_uuid: string;
  resource_policy_uuid: string;
  name?: string;
  description?: string;
  alertConfigs?: AlertConfig[];
  savedFilterUUIDs?: string[];
  filters?: ResourceFilter[];
  premadeFilterUUIDs?: string[];
}) {
  const url = `${API_BASE_URL}/organisations/${args.org_uuid}/resource-policies/${args.resource_policy_uuid}`;

  const payload: UpdateResourcePolicyPayload = {};

  // Only include fields that were provided
  if (args.name) payload.name = args.name;
  if (args.description) payload.description = args.description;
  if (args.alertConfigs) payload.alertConfigs = args.alertConfigs;
  if (args.savedFilterUUIDs) payload.savedFilterUUIDs = args.savedFilterUUIDs;
  if (args.filters) payload.filters = args.filters;
  if (args.premadeFilterUUIDs)
    payload.premadeFilterUUIDs = args.premadeFilterUUIDs;

  const response = await makeAuthenticatedRequest(url, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as ResourcePolicy;

  return {
    content: [
      {
        type: "text",
        text: `Resource policy updated successfully:\n${JSON.stringify(
          data,
          null,
          2
        )}`,
      },
    ],
  };
}

async function deleteResourcePolicy(
  orgUuid: string,
  resourcePolicyUuid: string
) {
  const url = `${API_BASE_URL}/organisations/${orgUuid}/resource-policies/${resourcePolicyUuid}`;

  const response = await makeAuthenticatedRequest(url, { method: "DELETE" });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as { message: string };

  return {
    content: [
      {
        type: "text",
        text: data.message || "Resource policy deleted successfully",
      },
    ],
  };
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Firetail Resource Policy MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
