import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserDashboards } from "@/lib/dashboard-service";
import { Calendar, Users } from "lucide-react";
import { DashboardTable } from "./components";

export default function CollabPage() {
    const dashboardPromise = getUserDashboards(user.userId);
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center gap-3">
                <Users className="h-8 w-8" />
                <h1 className="text-3xl font-bold">My Dashboards</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Dashboard List
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <DashboardTable dashboardPromise={dashboardPromise} />
                </CardContent>
            </Card>
        </div>
    );
}
