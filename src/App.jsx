import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://pretorial-portliest-vertie.ngrok-free.dev";

// =============================================================================
// API CLIENT
// =============================================================================
const api = {
  async request(endpoint, options = {}) {
    const res = await fetch(`${SERVER_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...options.headers,
      },
    });
    
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    
    console.log(`[API] ${options.method || "GET"} ${endpoint}`, res.status, data);
    return { ok: res.ok, status: res.status, data };
  },
  
  get: (endpoint) => api.request(endpoint),
  post: (endpoint, body) => api.request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  delete: (endpoint) => api.request(endpoint, { method: "DELETE" }),
};

// =============================================================================
// MAIN APP
// =============================================================================
export default function MessengerApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("login"); // login, signup, profile, chat

  // Check if already logged in
  useEffect(() => {
    api.get("/api/auth/userinfo").then(({ ok, data }) => {
      if (ok && data && data.id) {
        setUser(data);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={styles.center}><p>Loading...</p></div>;
  }

  // Not logged in - show auth
  if (!user) {
    return (
      <AuthScreen
        view={view}
        setView={setView}
        onLogin={(userData) => setUser(userData)}
      />
    );
  }

  // Logged in but profile not set up
  if (!user.profileSetup) {
    return (
      <ProfileSetup
        user={user}
        onComplete={(userData) => setUser(userData)}
      />
    );
  }

  // Fully authenticated - show chat
  return (
    <ChatScreen
      user={user}
      onLogout={() => {
        api.post("/api/auth/logout", {});
        setUser(null);
      }}
    />
  );
}

// =============================================================================
// AUTH SCREEN
// =============================================================================
function AuthScreen({ view, setView, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter email and password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    
    const endpoint = view === "login" ? "/api/auth/login" : "/api/auth/signup";
    const { ok, status, data } = await api.post(endpoint, { 
      email: email.trim(), 
      password 
    });
    
    setLoading(false);

    if (ok && data.user) {
      onLogin(data.user);
    } else {
      if (status === 404) setError("No account found with this email");
      else if (status === 400) setError("Invalid email or password");
      else if (status === 409) setError("Email already registered");
      else setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h1 style={styles.title}>{view === "login" ? "Sign In" : "Sign Up"}</h1>
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          
          {error && <p style={styles.error}>{error}</p>}
          
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Please wait..." : view === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p style={styles.switchText}>
          {view === "login" ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setView(view === "login" ? "signup" : "login"); setError(""); }}
            style={styles.link}
          >
            {view === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// PROFILE SETUP
// =============================================================================
function ProfileSetup({ user, onComplete }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name");
      return;
    }

    setLoading(true);
    
    const { ok, data, status } = await api.post("/api/auth/update-profile", {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
    
    setLoading(false);

    console.log("[ProfileSetup] Response:", { ok, status, data });

    if (ok) {
      // API returns user object directly, NOT wrapped in { user: ... }
      // The response IS the user object: { id, email, firstName, lastName, profileSetup: true, ... }
      if (data && (data.id || data._id) && data.profileSetup) {
        onComplete(data);
      } else {
        // Fallback: fetch user info again
        console.log("[ProfileSetup] Unexpected response, fetching userinfo...");
        const { ok: ok2, data: data2 } = await api.get("/api/auth/userinfo");
        if (ok2 && data2 && data2.id) {
          onComplete(data2);
        } else {
          setError("Profile saved but failed to refresh. Please reload the page.");
        }
      }
    } else {
      if (status === 400) setError("Please fill in all fields");
      else if (status === 401) setError("Session expired. Please login again.");
      else setError("Failed to update profile. Please try again.");
    }
  };

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h1 style={styles.title}>Complete Your Profile</h1>
        <p style={styles.subtitle}>Hi {user.email}! Please enter your name.</p>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={styles.input}
            disabled={loading}
          />
          
          {error && <p style={styles.error}>{error}</p>}
          
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Saving..." : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// CHAT SCREEN
// =============================================================================
function ChatScreen({ user, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  // Use a ref to track selected contact so socket callback has current value
  const selectedContactRef = useRef(null);

  // Keep the ref in sync with state
  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, []);

  // Setup socket
  useEffect(() => {
    // Pass userId as query parameter so server can map socket to user
    socketRef.current = io(SERVER_URL, {
      withCredentials: true,
      extraHeaders: { "ngrok-skip-browser-warning": "true" },
      query: { userId: user.id },
    });

    socketRef.current.on("connect", () => {
      console.log("[Socket] Connected:", socketRef.current.id, "as user:", user.id);
    });

    socketRef.current.on("receiveMessage", (msg) => {
      console.log("[Socket] Received message:", msg);
      
      // Helper to extract ID from string or object
      const getId = (val) => {
        if (!val) return null;
        if (typeof val === "string") return val;
        return val._id || val.id || null;
      };
      
      const senderId = getId(msg.sender);
      const currentContact = selectedContactRef.current;
      
      console.log("[Socket] Processing - senderId:", senderId, "myId:", user.id, "contactId:", currentContact?._id);
      
      // Skip if I sent this message (we already added it optimistically)
      if (senderId === user.id) {
        console.log("[Socket] Skipping own message (already added optimistically)");
        loadContacts(); // Still refresh contact list
        return;
      }
      
      // Add message if it's from my currently selected contact
      if (currentContact && senderId === currentContact._id) {
        console.log("[Socket] Adding message from current contact");
        setMessages((prev) => [...prev, msg]);
      } else {
        console.log("[Socket] Message from different contact, not adding to current view");
        // Could add a notification badge here in the future
      }
      
      // Always refresh contacts to update last message time and order
      loadContacts();
    });

    socketRef.current.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    socketRef.current.on("connect_error", (error) => {
      console.log("[Socket] Connection error:", error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadContacts = async () => {
    const { ok, data } = await api.get("/api/contacts/get-contacts-for-list");
    if (ok && data.contacts) {
      setContacts(data.contacts);
    }
  };

  const loadMessages = async (contactId) => {
    const { ok, data } = await api.post("/api/messages/get-messages", { id: contactId });
    if (ok && data.messages) {
      setMessages(data.messages);
    } else {
      setMessages([]);
    }
  };

  const selectContact = (contact) => {
    setSelectedContact(contact);
    loadMessages(contact._id);
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedContact || !socketRef.current) return;

    const content = messageInput.trim();
    
    // Create optimistic message to show immediately
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      sender: user.id,
      recipient: selectedContact._id,
      content: content,
      messageType: "text",
      timestamp: new Date().toISOString(),
    };
    
    // Add message to UI immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    setMessageInput("");

    // Send via socket
    socketRef.current.emit("sendMessage", {
      sender: user.id,
      recipient: selectedContact._id,
      content: content,
      messageType: "text",
    });
    
    console.log("[Socket] Sent message:", content);
  };

  const searchContacts = async () => {
    if (!searchTerm.trim()) return;
    const { ok, data } = await api.post("/api/contacts/search", { searchTerm: searchTerm.trim() });
    if (ok && data.contacts) {
      setSearchResults(data.contacts);
    }
  };

  const startConversation = (contact) => {
    selectContact(contact);
    setShowSearch(false);
    setSearchTerm("");
    setSearchResults([]);
  };

  const deleteConversation = async (dmId, e) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    const { ok } = await api.delete(`/api/contacts/delete-dm/${dmId}`);
    if (ok) {
      loadContacts();
      if (selectedContact?._id === dmId) {
        setSelectedContact(null);
        setMessages([]);
      }
    }
  };

  const isMyMessage = (msg) => {
    const senderId = typeof msg.sender === "object" ? (msg.sender.id || msg.sender._id) : msg.sender;
    return senderId === user.id;
  };

  const getInitials = (c) => {
    if (c.firstName && c.lastName) return `${c.firstName[0]}${c.lastName[0]}`.toUpperCase();
    return c.email?.[0]?.toUpperCase() || "?";
  };

  const getName = (c) => {
    if (c.firstName && c.lastName) return `${c.firstName} ${c.lastName}`;
    return c.email || "Unknown";
  };

  return (
    <div style={styles.chatContainer}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        {/* Header */}
        <div style={styles.sidebarHeader}>
          <div>
            <div style={styles.userName}>{getName(user)}</div>
            <div style={styles.userEmail}>{user.email}</div>
          </div>
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>

        {/* Search */}
        <div style={styles.searchSection}>
          {showSearch ? (
            <div style={styles.searchBox}>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchContacts()}
                style={styles.searchInput}
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchResults([]); }} style={styles.cancelBtn}>✕</button>
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} style={styles.newChatBtn}>+ New Chat</button>
          )}
        </div>

        {/* Search Results */}
        {showSearch && searchResults.length > 0 && (
          <div style={styles.contactList}>
            <div style={styles.label}>Search Results</div>
            {searchResults.map((c) => (
              <div key={c._id} onClick={() => startConversation(c)} style={styles.contactItem}>
                <div style={styles.avatar}>{getInitials(c)}</div>
                <div>
                  <div style={styles.contactName}>{getName(c)}</div>
                  <div style={styles.contactEmail}>{c.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contacts */}
        <div style={styles.contactList}>
          <div style={styles.label}>Conversations</div>
          {contacts.length === 0 ? (
            <div style={styles.empty}>No conversations yet</div>
          ) : (
            contacts.map((c) => (
              <div
                key={c._id}
                onClick={() => selectContact(c)}
                style={{
                  ...styles.contactItem,
                  backgroundColor: selectedContact?._id === c._id ? "#e0e7ff" : "transparent",
                }}
              >
                <div style={styles.avatar}>{getInitials(c)}</div>
                <div style={{ flex: 1 }}>
                  <div style={styles.contactName}>{getName(c)}</div>
                  <div style={styles.contactEmail}>
                    {c.lastMessageTime && new Date(c.lastMessageTime).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={(e) => deleteConversation(c._id, e)} style={styles.deleteBtn}>🗑</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={styles.chatArea}>
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div style={styles.chatHeader}>
              <div style={styles.avatar}>{getInitials(selectedContact)}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.contactName}>{getName(selectedContact)}</div>
                <div style={styles.contactEmail}>{selectedContact.email}</div>
              </div>
              <button 
                onClick={() => {
                  if (confirm("Delete this conversation? This cannot be undone.")) {
                    api.delete(`/api/contacts/delete-dm/${selectedContact._id}`).then(({ ok }) => {
                      if (ok) {
                        loadContacts();
                        setSelectedContact(null);
                        setMessages([]);
                      }
                    });
                  }
                }}
                style={styles.deleteChatBtn}
              >
                🗑 Delete Chat
              </button>
            </div>

            {/* Messages */}
            <div style={styles.messagesArea}>
              {messages.map((msg, i) => (
                <div
                  key={msg._id || i}
                  style={{
                    ...styles.messageRow,
                    justifyContent: isMyMessage(msg) ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={isMyMessage(msg) ? styles.myMessage : styles.theirMessage}>
                    <div>{msg.content}</div>
                    <div style={styles.messageTime}>
                      {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={styles.inputArea}>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                style={styles.messageInputField}
              />
              <button onClick={sendMessage} style={styles.sendBtn} disabled={!messageInput.trim()}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={styles.noChat}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div>Select a conversation to start chatting</div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = {
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    backgroundColor: "white",
    padding: 32,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: 400,
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: 24,
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 24px 0",
    color: "#666",
    textAlign: "center",
    fontSize: 14,
  },
  input: {
    display: "block",
    width: "100%",
    padding: 12,
    marginBottom: 12,
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: 12,
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    margin: "0 0 12px 0",
    padding: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 4,
  },
  switchText: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 14,
    color: "#666",
  },
  link: {
    background: "none",
    border: "none",
    color: "#4f46e5",
    cursor: "pointer",
    fontWeight: 600,
  },

  // Chat Layout
  chatContainer: {
    display: "flex",
    height: "100vh",
    fontFamily: "system-ui, sans-serif",
  },
  sidebar: {
    width: 300,
    backgroundColor: "#f9fafb",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
  },
  sidebarHeader: {
    padding: 16,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontWeight: 600,
    fontSize: 14,
  },
  userEmail: {
    fontSize: 12,
    color: "#666",
  },
  logoutBtn: {
    padding: "6px 12px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
  },
  searchSection: {
    padding: 12,
    borderBottom: "1px solid #e5e7eb",
  },
  searchBox: {
    display: "flex",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: 8,
    border: "1px solid #ddd",
    borderRadius: 6,
    fontSize: 14,
  },
  cancelBtn: {
    padding: "0 12px",
    backgroundColor: "#fee2e2",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  newChatBtn: {
    width: "100%",
    padding: 10,
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 500,
  },
  contactList: {
    flex: 1,
    overflowY: "auto",
  },
  label: {
    padding: "12px 16px 8px",
    fontSize: 11,
    fontWeight: 600,
    color: "#666",
    textTransform: "uppercase",
  },
  contactItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 16px",
    cursor: "pointer",
    borderBottom: "1px solid #f3f4f6",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#4f46e5",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: 12,
    flexShrink: 0,
  },
  contactName: {
    fontWeight: 500,
    fontSize: 14,
  },
  contactEmail: {
    fontSize: 12,
    color: "#666",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    opacity: 0.6,
    fontSize: 14,
    padding: "4px 8px",
    borderRadius: 4,
    transition: "opacity 0.2s, background 0.2s",
  },
  empty: {
    padding: 24,
    textAlign: "center",
    color: "#999",
    fontSize: 14,
  },

  // Chat Area
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "white",
  },
  chatHeader: {
    padding: 16,
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  deleteChatBtn: {
    padding: "8px 12px",
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
  },
  messagesArea: {
    flex: 1,
    padding: 16,
    overflowY: "auto",
    backgroundColor: "#f9fafb",
  },
  messageRow: {
    display: "flex",
    marginBottom: 8,
  },
  myMessage: {
    backgroundColor: "#4f46e5",
    color: "white",
    padding: "10px 14px",
    borderRadius: "16px 16px 4px 16px",
    maxWidth: "70%",
  },
  theirMessage: {
    backgroundColor: "#e5e7eb",
    color: "#111",
    padding: "10px 14px",
    borderRadius: "16px 16px 16px 4px",
    maxWidth: "70%",
  },
  messageTime: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 4,
    textAlign: "right",
  },
  inputArea: {
    padding: 16,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: 12,
  },
  messageInputField: {
    flex: 1,
    padding: 12,
    border: "1px solid #ddd",
    borderRadius: 24,
    fontSize: 14,
  },
  sendBtn: {
    padding: "0 24px",
    backgroundColor: "#4f46e5",
    color: "white",
    border: "none",
    borderRadius: 24,
    cursor: "pointer",
    fontWeight: 600,
  },
  noChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#999",
    gap: 16,
  },
};
