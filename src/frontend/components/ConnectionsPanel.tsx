import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UUID } from "@elizaos/core";

interface TwitterConnection {
  service: string;
  serviceName: string;
  isConnected: boolean;
  username?: string;
  userId?: string;
  displayName: string;
  icon: string;
  color: string;
  description: string;
  lastChecked: string;
}

interface ConnectionsResponse {
  agentId: UUID;
  connections: TwitterConnection[];
  lastUpdated: string;
}

interface ConnectionsPanelProps {
  agentId: UUID;
}

export const ConnectionsPanel: React.FC<ConnectionsPanelProps> = ({
  agentId,
}) => {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // Fetch connections
  const {
    data: connectionsData,
    isLoading,
    error,
  } = useQuery<ConnectionsResponse>({
    queryKey: ["connections", agentId],
    queryFn: async () => {
      const response = await fetch(`/api/connections`);
      if (!response.ok) {
        throw new Error("Failed to fetch connections");
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/connections/twitter/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", agentId] });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/connections/twitter/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to test connection");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", agentId] });
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const response = await fetch("/api/auth/twitter/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate Twitter connection");
      }

      const data = await response.json();

      // For mock implementation, simulate successful connection after 2 seconds
      setTimeout(() => {
        setIsConnecting(false);
        queryClient.invalidateQueries({
          queryKey: ["connections", agentId],
        });
      }, 2000);
    } catch (error) {
      console.error("Connection failed:", error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm("Are you sure you want to disconnect from Twitter?")) {
      disconnectMutation.mutate();
    }
  };

  const handleTest = async () => {
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <div>
        <div></div>
        <span>Loading connections...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>
          Error loading connections
        </div>
        <div>
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  const twitterConnection = connectionsData?.connections.find(
    (conn) => conn.service === "twitter",
  );

  if (!twitterConnection) {
    return (
      <div>
        <div>
          Twitter connection not available
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1>Twitter Connection</h1>
        <p>
          Connect your agent to Twitter to enable posting and interactions.
        </p>
      </div>

      <TwitterConnectionCard
        connection={twitterConnection}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onTest={handleTest}
        isConnecting={isConnecting}
        isDisconnecting={disconnectMutation.isPending}
        isTesting={testConnectionMutation.isPending}
      />

      {connectionsData?.lastUpdated && (
        <p>
          Last updated: {new Date(connectionsData.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
};

interface TwitterConnectionCardProps {
  connection: TwitterConnection;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isTesting: boolean;
}

const TwitterConnectionCard: React.FC<TwitterConnectionCardProps> = ({
  connection,
  onConnect,
  onDisconnect,
  onTest,
  isConnecting,
  isDisconnecting,
  isTesting,
}) => {
  const getStatusText = (isConnected: boolean) => {
    return isConnected ? "Connected" : "Not connected";
  };

  return (
    <div>
      <div>
        <div>
          <div>
            <div
              style={{ backgroundColor: connection.color }}
            >
              𝕏
            </div>
            <div>
              <div>{connection.displayName}</div>
              <div>
                <div>
                  {getStatusText(connection.isConnected)}
                </div>
                {connection.isConnected && (
                  <div></div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div>{connection.description}</div>
      </div>
      
      <div>
        {connection.isConnected && connection.username && (
          <div>
            <div>
              <div>
                <span>Username:</span>
                <span>@{connection.username}</span>
              </div>
              {connection.userId && (
                <div>
                  <span>User ID:</span>
                  <span>{connection.userId}</span>
                </div>
              )}
              <div>
                <span>Last Check:</span>
                <span>
                  {new Date(connection.lastChecked).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div>
          {connection.isConnected ? (
            <>
              <button
                onClick={onTest}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <div></div>
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </button>
              <button
                onClick={onDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <div></div>
                    Disconnecting...
                  </>
                ) : (
                  "Disconnect"
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <div></div>
                  Connecting...
                </>
              ) : (
                "Connect to Twitter"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};