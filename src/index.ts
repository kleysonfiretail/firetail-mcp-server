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

type PlatformType = "api" | "ai";

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
  platformType: PlatformType;
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
  platformType: PlatformType;
  itemType: string;
  indexName: string;
  createdBy: string;
}

// Configuration
const API_BASE_URL = process.env.FIRETAIL_API_URL || "";
const CLIENT_ID = process.env.FIRETAIL_CLIENT_ID || "";
const CLIENT_SECRET = process.env.FIRETAIL_CLIENT_SECRET || "";
const DEFAULT_ORG_UUID = process.env.FIRETAIL_DEFAULT_ORG_UUID || "";
const DEFAULT_PLATFORM_TYPE =
  (process.env.FIRETAIL_DEFAULT_PLATFORM_TYPE as PlatformType) || "ai";

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
      description:
        "List all premade filters (suggested policies) for an organisation",
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
        required: [],
      },
    },
    {
      name: "list_existing_integrations_for_policy",
      description:
        "List all existing notification integrations for an organisation",
      inputSchema: {
        type: "object",
        properties: {
          org_uuid: {
            type: "string",
            description: "Organisation UUID",
          },
          query: {
            type: "string",
            description:
              "Optional search query to filter existing integrations by name",
          },
        },
        required: [],
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
        required: [],
      },
    },
    {
      name: "list_resource_policies",
      description: "List all resource policies for an organisation",
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
          query: {
            type: "string",
            description: "Optional search query to filter policies by name",
          },
        },
        required: [],
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
          notificationUUIDs: {
            type: "array",
            description: "Notification integration UUIDs for alerts",
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
          "name",
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
        required: ["resource_policy_uuid"],
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
          notificationUUIDs: {
            type: "array",
            description: "Notification integration UUIDs for alerts",
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
        required: ["resource_policy_uuid"],
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
        required: ["resource_policy_uuid"],
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
          args.platform as PlatformType
        );

      case "list_existing_integrations_for_policy":
        return await listExistingIntegrationsForPolicy(
          args.org_uuid as string,
          args.query as string | undefined
        );

      case "list_resource_items":
        return await listResourceItems(
          args.org_uuid as string,
          args.platform as PlatformType
        );

      case "list_resource_policies":
        return await listResourcePolicies(
          args.org_uuid as string,
          args.platform as PlatformType,
          args.query as string | undefined
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

async function listPremadeFilters(
  orgUuid = DEFAULT_ORG_UUID,
  platform = DEFAULT_PLATFORM_TYPE
) {
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

async function listExistingIntegrationsForPolicy(
  orgUuid = DEFAULT_ORG_UUID,
  query?: string
) {
  const resource = "integration";
  const url = `${API_BASE_URL}/organisations/${orgUuid}/search?resource=${resource}&pageSize=100`;

  const payload = {
    search_value: query || "",
    filters: [
      {
        field: "integration_uuid",
        values: [
          "60b7faa9-dec6-4105-ae58-e6f528908559",
          "60b7faa9-dec6-4105-ae58-e6f528901695",
          "d0b7faa9-6ec6-41dd-ae58-e6f528908234",
          "d0b7faa9-6ec6-41dd-ae58-e6f528908510",
          "d0b7faa9-6ec6-4105-ae58-e6f528908510",
          "60b7faa9-6ec6-4105-ae58-e6f528908146",
          "44592ca4-c04f-4ef5-8607-de9c2695244c",
          "4c9db41b-a30a-4b28-aa08-2f828f506026",
          "3da10bb5-38d7-4da0-b257-b16f82f25606",
          "38eef000-6e20-4621-a2bc-f1de29596cfc",
        ],
      },
    ],
    sort: { order: "desc" },
    resource,
  };

  const response = await makeAuthenticatedRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

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

async function listResourcePolicies(
  orgUuid = DEFAULT_ORG_UUID,
  platform = DEFAULT_PLATFORM_TYPE,
  query?: string
) {
  const resource = "resource_policy";
  const url = `${API_BASE_URL}/organisations/${orgUuid}/search?resource=${resource}&pageSize=100`;

  const searchFilters = [
    {
      field: "platformType",
      operator: "is-one-of",
      values: [platform.toLowerCase()],
    },
  ];

  const payload = {
    filters: searchFilters,
    search_value: query,
    resource,
    sort: { order: "desc" },
  };

  const response = await makeAuthenticatedRequest(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

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

async function listResourceItems(
  orgUuid = DEFAULT_ORG_UUID,
  platform = DEFAULT_PLATFORM_TYPE
) {
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

async function createResourcePolicy({
  org_uuid = DEFAULT_ORG_UUID,
  platformType = DEFAULT_PLATFORM_TYPE,
  ...args
}: {
  org_uuid: string;
  name: string;
  description?: string;
  platformType: PlatformType;
  notificationUUIDs: string[];
  savedFilterUUIDs: string[];
  filters: ResourceFilter[];
  premadeFilterUUIDs: string[];
}) {
  const url = `${API_BASE_URL}/organisations/${org_uuid}/resource-policies`;

  const payload: CreateResourcePolicyPayload = {
    name: args.name,
    platformType: platformType,
    alertConfigs: [
      {
        UUID: crypto.randomUUID(),
        notificationIntegrations: args.notificationUUIDs.map((uuid) => uuid),
        minimumResources: 1,
      },
    ],
    savedFilterUUIDs: args.savedFilterUUIDs,
    filters: args.filters,
    premadeFilterUUIDs: args.premadeFilterUUIDs,
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
  orgUuid = DEFAULT_ORG_UUID,
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

async function updateResourcePolicy({
  org_uuid = DEFAULT_ORG_UUID,
  ...args
}: {
  org_uuid: string;
  resource_policy_uuid: string;
  name?: string;
  description?: string;
  notificationUUIDs?: string[];
  savedFilterUUIDs?: string[];
  filters?: ResourceFilter[];
  premadeFilterUUIDs?: string[];
}) {
  const url = `${API_BASE_URL}/organisations/${org_uuid}/resource-policies/${args.resource_policy_uuid}`;

  const payload: UpdateResourcePolicyPayload = {};

  // Only include fields that were provided
  if (args.name) payload.name = args.name;
  if (args.description) payload.description = args.description;
  if (args.notificationUUIDs)
    payload.alertConfigs = [
      {
        UUID: crypto.randomUUID(),
        notificationIntegrations: args.notificationUUIDs.map((uuid) => uuid),
        minimumResources: 1,
      },
    ];
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
  orgUuid = DEFAULT_ORG_UUID,
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
