CS-314 Project Report

This document covers the development of a frontend chat application that integrates with a provided backend API. The application supports user authentication, real-time messaging via WebSockets, and conversation management. 

App Code Structure:
App.jsx
|
|-- API Client (lines 9-35)
|   Reusable fetch wrapper with credentials and headers
|
|-- Main App Component (lines 40-90)
|   Handles auth state and routing between screens
|
|-- AuthScreen Component (lines 95-177)
|   Login and signup forms with validation
|
|-- ProfileSetup Component (lines 182-262)
|   First and last name form for new users
|
|-- ChatScreen Component (lines 268-603)
|   - Socket.IO setup and message handling
|   - Contact list with search
|   - Message display and sending
|   - Conversation deletion
|
|-- Styles Object (lines 609-891)


Authentication:
POST /api/auth/signup Create new account
POST /api/auth/login Log in and receive JWT cookie
POST /api/auth/logout Clear session
GET /api/auth/userinfo Check authentication status
POST /api/auth/update-profile Set first and last name
Contacts:
POST /api/contacts/search Find users by name or email
GET /api/contacts/get-contacts-for-list Get conversations sorted by recent
DELETE /api/contacts/delete-dm/:id Remove a conversation
Messages:
POST /api/messages/get-messages Load chat history
Socket.IO Events:
sendMessage (client to server)
receiveMessage (server to client)
Tests Performed
Authentication:
Signup with new email creates account and returns user object
Signup with existing email displays error message
Login with valid credentials redirects to chat
Login with incorrect password displays error message
Login with non-existent email displays error message
Session persists across page refresh
Logout clears session and returns to login screen

Profile Setup: 
New users are directed to profile setup screen
Submitting first and last name updates profile 
After setup completion, user proceeds to main chat screen
Empty fields trigger validation error
Messaging:
Sent messages appear instantly for sender via amazing update!
Received messages appear instantly for recipient via WebSocket
Message history loads when selecting a contact
Messages auto-scroll to bottom
Contact Management:
Search returns users matching name or email
Starting conversation with search result functions correctly
Contact list displays recent conversations 
Deleting conversation removes it from list
Delete button in chat header functions correctly
Challenges Faced
1. Profile Update Response Format
Problem: After signup, users (me) encountered "Failed to update profile" despite successful API calls.
Cause: The login and signup endpoints return { user: {...} } but the update-profile endpoint returns the user object directly {...} without a wrapper.
Solution: Modified the ProfileSetup handler to check for data.id directly rather than data.user. Added a fallback that re-fetches /api/auth/userinfo if the response structure is unexpected.
2. Messages Not Appearing for Recipient
Problem: Sender (me) saw messages instantly but recipient required page refresh.
Cause: The Socket.IO server requires knowledge of which user owns each socket connection. Without the userId, the server could not route messages to the correct recipient.
Solution: Added userId as a query parameter during socket connection.
3. Stale State in Socket Callbacks
Problem: The receiveMessage callback held a stale reference to selectedContact, preventing correct determination of whether messages belonged to the current conversation.
Cause: React closures capture state at callback creation time. Subsequent state changes are not reflected in the callback.
Solution: Implemented useRef to maintain current value access.

Additional Features
Debug Logging
All API calls and socket events log to the console with prefixes for identification.
[API] POST /api/auth/login 200 {user: {...}}
[Socket] Connected: abc123 as user: 507f1f77
[Socket] Received message: {...}
Multiple Deletion Options
Conversations can be deleted from two locations:
Trash icon in the contact list
Delete Chat button in the chat header
Both options request confirmation before deletion.
Auto-scroll on New Messages
The chat view automatically scrolls to display new messages.
Visual Feedback
Loading states on buttons during operations
Error messages displayed in styled containers
Selected conversation highlighted in sidebar
Send button disabled when message input is empty
