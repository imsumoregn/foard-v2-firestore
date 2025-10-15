# **App Name**: Foard: Functional Dashboard

## Core Features:

- Dashboard UI: Display a clean and modern dashboard interface where users can add tasks, and the tasks will be put to suitable place using tags such as N1, N2, N3 (Now), D1, D2 (Day), W1, W2 (Week), M1, M2 (Month).
- Note-Taking: Implement a note-taking feature with rich text editing capabilities.
- Reading List: Enable users to add books or articles to a reading list.
- PWA Support: Convert the web app into a Progressive Web App (PWA) for installable and offline use.
- Goal Tracking: Allow users to set goals and track progress towards their goals, with visual representations of their progress.
- Daily Inspiration: Display a daily quote or motivational message to inspire users.

## Auth and Collaboration Additions

- Users authenticate with name + lucky number (1–9999). `userId = sha256(lowercase(name)+":"+lucky)`. Stored locally and in Firestore `users/{userId}`.
- Data model:
  - `users/{userId}`: { name, luckyNumber, createdAt }
  - `dashboards/{dashboardId}`: { name, ownerId, createdAt }
  - `dashboardMembers/{dashboardId}_{userId}`: { dashboardId, userId, role, joinedAt }
  - `dashboards/{dashboardId}/tasks/{taskId}`: task documents
  - `dashboardInvites/{inviteId}`: { dashboardId, createdBy, token, expiresAt }
- Invites: create tokened link `/collab/{dashboardId}?invite=TOKEN`; recipient is prompted to accept and becomes a member.
- Suggested Firestore rules (outline):
  - Allow read/write on `dashboards/{id}/tasks` if membership document exists for `request.auth.uid`.
  - Allow creating `dashboardMembers` with valid invite context (future: move to server function).

## Style Guidelines:

- Primary color: Muted teal (#73A79D) to create a calm and focused environment.
- Background color: Dark gray (#333333) as the default dark theme.
- Secondary Background color: Light teal (#E0F4F1) to complement the primary and keep things bright in alternative themes.
- Accent color: Subtle gold (#BFA181) to create contrast, especially in key interactive elements.
- Body and headline font: 'Inter', a sans-serif with a modern, machined, objective, neutral look.
- Modern, clean design with a focus on usability. The interface will include clear sectioning and intuitive navigation for all the functional areas.
- Simple, minimalist icons to represent different tasks and categories. These should be easily recognizable and fit the overall clean aesthetic.
- Subtle transitions and animations to provide feedback on user interactions and enhance the overall user experience without being distracting.