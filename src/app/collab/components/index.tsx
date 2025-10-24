"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { UserDashboard } from "@/lib/dashboard-service";
import { format } from "date-fns";
import { ExternalLink, Users } from "lucide-react";
import Link from "next/link";
import { use } from "react";

const getRoleBadgeVariant = (role: string) => {
    return role === "owner" ? "default" : "secondary";
};

const formatDate = (timestamp: any) => {
    if (!timestamp) return "Never";
    return format(timestamp.toDate(), "MMM dd, yyyy HH:mm");
};

export function DashboardTable(dashboardPromise: Promise<UserDashboard[]>) {
    const { user } = useAuth();
    if (!user) return null;

    const dashboards = use(dashboardPromise);

    if (dashboards.length === 0) {
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                    No Dashboards Yet
                </h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                    You're not a member of any dashboards yet. Create your own
                    dashboard or ask someone to invite you to theirs.
                </p>
                <Button asChild>
                    <Link href="/collab/new">Create Dashboard</Link>
                </Button>
            </CardContent>
        </Card>;
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Dashboard Name</TableHead>
                        <TableHead>Your Role</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {dashboards.map(({ dashboard, member }) => (
                        <TableRow key={dashboard.id}>
                            <TableCell className="font-medium">
                                {dashboard.name}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={getRoleBadgeVariant(member.role)}
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
                                <Button variant="outline" size="sm" asChild>
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
        </>
    );
}
