import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';

export type DashboardMember = {
  dashboardId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: Timestamp;
};

export type Dashboard = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  lastUpdated?: Timestamp;
};

export type UserDashboard = {
  dashboard: Dashboard;
  member: DashboardMember;
};

export async function getUserDashboards(userId: string): Promise<UserDashboard[]> {
  try {
    // Get all dashboard memberships for the user
    const membersQuery = query(
      collection(db, 'dashboardMembers'),
      where('userId', '==', userId)
    );
    
    const membersSnapshot = await getDocs(membersQuery);
    const members: DashboardMember[] = [];
    
    membersSnapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        dashboardId: data.dashboardId,
        userId: data.userId,
        role: data.role,
        joinedAt: data.joinedAt,
      });
    });

    if (members.length === 0) {
      return [];
    }

    // Fetch all dashboard documents in parallel instead of sequentially.
    const dashboardPromises = members.map(async (member) => {
      const dashboardDoc = await getDoc(doc(db, 'dashboards', member.dashboardId));
      
      if (dashboardDoc.exists()) {
        const dashboardData = dashboardDoc.data();
        
        // Use lastUpdated from dashboard document instead of querying tasks.
        const dashboard: Dashboard = {
          id: member.dashboardId,
          name: dashboardData.name,
          ownerId: dashboardData.ownerId,
          createdAt: dashboardData.createdAt,
          // `lastUpdated` is directly from dashboard doc (maintained by task mutations).
          lastUpdated: dashboardData.lastUpdated || dashboardData.createdAt,
        };
        
        return {
          dashboard,
          member,
        } as UserDashboard;
      }
      return null;
    });

    // Wait for all dashboard fetches to complete in parallel.
    const userDashboards = (await Promise.all(dashboardPromises)).filter(
      (item): item is UserDashboard => item !== null
    );

    // Sort by lastUpdated (most recent first), then by createdAt if no updates
    userDashboards.sort((a, b) => {
      const aTime = a.dashboard.lastUpdated || a.dashboard.createdAt;
      const bTime = b.dashboard.lastUpdated || b.dashboard.createdAt;
      return bTime.toMillis() - aTime.toMillis();
    });

    return userDashboards;
  } catch (error) {
    console.error('Error fetching user dashboards:', error);
    return [];
  }
}
