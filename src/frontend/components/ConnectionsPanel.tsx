import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UUID } from "@elizaos/core";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

interface Connection {
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
  connections: Connection[];
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
    <div className="space-y-6 p-6">
      <ConnectionCard
        connection={twitterConnection}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onTest={handleTest}
        isConnecting={isConnecting}
        isDisconnecting={disconnectMutation.isPending}
        isTesting={testConnectionMutation.isPending}
      />
    </div>
  );
};

interface ConnectionCardProps {
  connection: Connection;
  onConnect: () => void;
  onDisconnect: () => void;
  onTest: () => void;
  isConnecting: boolean;
  isDisconnecting: boolean;
  isTesting: boolean;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  onConnect,
  onDisconnect,
  onTest,
  isConnecting,
  isDisconnecting,
  isTesting,
}) => {
  const getStatusBadge = (isConnected: boolean) => {
    return isConnected ? (
      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
        Connected
      </span>
    ) : (
      <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
        Disconnected
      </span>
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{connection.displayName}</span>
              {getStatusBadge(connection.isConnected)}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {connection.isConnected ? (
            <Button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className="w-[120px] opacity-50 hover:opacity-100"
            >
              {isDisconnecting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Disconnecting...
                </>
              ) : (
                "Disconnect"
              )}
            </Button>
          ) : (
            <Button
              onClick={onConnect}
              disabled={isConnecting}
              className="w-[120px]"
            >
              {isConnecting ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};