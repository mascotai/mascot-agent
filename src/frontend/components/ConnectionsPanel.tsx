import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UUID } from "@elizaos/core";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";
import { Twitter, MessageCircle, Hash, Zap } from "lucide-react";

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

  // Fetch Twitter connection status only
  const {
    data: connectionsData,
    isLoading: isLoadingStatus,
    error: statusError,
  } = useQuery<ConnectionsResponse>({
    queryKey: ["connections", agentId],
    queryFn: async () => {
      const response = await fetch(`/api/connections?agentId=${agentId}`);
      if (!response.ok) {
        // If API fails, return null so we show default disconnected state
        return null;
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: false, // Don't retry on failure, just show disconnected
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (service: string) => {
      const response = await fetch(`/api/connections/${service}/disconnect?agentId=${agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to disconnect from ${service}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", agentId] });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (service: string) => {
      const response = await fetch(`/api/connections/${service}/test?agentId=${agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to test ${service} connection`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections", agentId] });
    },
  });

  const handleConnect = async (service: string) => {
    setIsConnecting(true);

    try {
      const response = await fetch(`/api/auth/${service}/connect?agentId=${agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate ${service} connection`);
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
      console.error(`${service} connection failed:`, error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (service: string) => {
    if (confirm(`Are you sure you want to disconnect from ${service}?`)) {
      disconnectMutation.mutate(service);
    }
  };

  const handleTest = async (service: string) => {
    testConnectionMutation.mutate(service);
  };

  // Skip loading and error states - go straight to connections component

  const connections = connectionsData?.connections || [];

  // Only render if we have connection data
  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 p-6">
      {connections.map((connection) => (
        <ConnectionCard
          key={connection.service}
          connection={connection}
          onConnect={() => handleConnect(connection.service)}
          onDisconnect={() => handleDisconnect(connection.service)}
          onTest={() => handleTest(connection.service)}
          isConnecting={isConnecting}
          isDisconnecting={disconnectMutation.isPending}
          isTesting={testConnectionMutation.isPending}
        />
      ))}
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

  const getServiceIcon = (service: string) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (service) {
      case "twitter":
        return <Twitter {...iconProps} />;
      case "discord":
        return <Hash {...iconProps} />;
      case "telegram":
        return <MessageCircle {...iconProps} />;
      default:
        return <Zap {...iconProps} />;
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            {getServiceIcon(connection.service)}
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