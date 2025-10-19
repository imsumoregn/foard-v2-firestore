"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getUserDashboards, type UserDashboard } from "@/lib/dashboard-service";
import { firestoreCache, cacheKeys } from "@/lib/firestore-cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const getRoleBadgeVariant = (role: string) => {
    return role === "owner" ? "default" : "secondary";
};

const formatDate = (timestamp: any) => {
    if (!timestamp) return "Never";
    return format(timestamp.toDate(), "MMM dd, yyyy HH:mm");
};

export default function CollabPage() {
    const { user } = useAuth();
    const [userDashboards, setUserDashboards] = useState<UserDashboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Use caching for dashboard data to reduce redundant fetches.
    useEffect(() => {
        async function fetchDashboards() {
            if (!user) return;

            try {
                setLoading(true);
                setError(null);

                // Check cache first for immediate display.
                const cacheKey = cacheKeys.userDashboards(user.userId);
                const cachedDashboards =
                    firestoreCache.get<UserDashboard[]>(cacheKey);
                if (cachedDashboards) {
                    console.log("INFO: cache hit");
                    setUserDashboards(cachedDashboards);
                    setLoading(false);
                } else {
                    console.log("INFO: cache miss");
                    // Fetch fresh data and update cache.
                    const dashboards = await getUserDashboards(user.userId);
                    setUserDashboards(dashboards);

                    // Cache the results with 5 minute TTL.
                    firestoreCache.set(cacheKey, dashboards, 5 * 60 * 1000);
                }
            } catch (err) {
                console.error("Failed to fetch dashboards:", err);
                setError("Failed to load dashboards. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboards();
    }, [user]);

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">
                        Please log in
                    </h2>
                    <p className="text-muted-foreground">
                        You need to be logged in to view your dashboards.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                        Loading your dashboards...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-destructive mb-4">
                        <Users className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-lg font-semibold">Error</p>
                    </div>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8" />
                <h1 className="text-3xl font-bold">My Dashboards</h1>
            </div>

            {userDashboards.length === 0 ? (
                // Empty state.
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="h-16 w-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">
                            No Dashboards Yet
                        </h3>
                        <p className="text-muted-foreground text-center mb-6 max-w-md">
                            You're not a member of any dashboards yet. Create
                            your own dashboard or ask someone to invite you to
                            theirs.
                        </p>
                        <Button asChild>
                            <Link href="/">Create Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Dashboard List ({userDashboards.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Dashboard Name</TableHead>
                                    <TableHead>Your Role</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userDashboards.map(({ dashboard, member }) => (
                                    <TableRow key={dashboard.id}>
                                        <TableCell className="font-medium">
                                            {dashboard.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={getRoleBadgeVariant(
                                                    member.role,
                                                )}
                                            >
                                                {member.role === "owner"
                                                    ? "Owner"
                                                    : "Member"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {dashboard.ownerId === user.userId
                                                ? "You"
                                                : "Other User"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(dashboard.lastUpdated)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDate(member.joinedAt)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={`/collab/${dashboard.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Open
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
