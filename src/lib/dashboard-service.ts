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

    // Get dashboard details for each membership
    const userDashboards: UserDashboard[] = [];
    
    for (const member of members) {
      const dashboardDoc = await getDoc(doc(db, 'dashboards', member.dashboardId));
      
      if (dashboardDoc.exists()) {
        const dashboardData = dashboardDoc.data();
        
        // Get the latest task update to determine lastUpdated
        const tasksQuery = query(
          collection(db, 'dashboards', member.dashboardId, 'tasks'),
          orderBy('updatedAt', 'desc'),
          // Limit to 1 to get the most recent task
          // Note: Firestore doesn't support limit with orderBy on subcollections in all cases
          // We'll fetch all and sort in memory for now
        );
        
        const tasksSnapshot = await getDocs(tasksQuery);
        let lastUpdated: Timestamp | undefined;
        
        if (!tasksSnapshot.empty) {
          // Get the most recent task's updatedAt
          const mostRecentTask = tasksSnapshot.docs[0];
          const taskData = mostRecentTask.data();
          lastUpdated = taskData.updatedAt || taskData.createdAt;
        }
        
        const dashboard: Dashboard = {
          id: member.dashboardId,
          name: dashboardData.name,
          ownerId: dashboardData.ownerId,
          createdAt: dashboardData.createdAt,
          lastUpdated: lastUpdated,
        };
        
        userDashboards.push({
          dashboard,
          member,
        });
      }
    }

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
