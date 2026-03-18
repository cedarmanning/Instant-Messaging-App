/**
 * MessengerApp System Testing Script
 * 
 * This script tests all major functionality of the messenger application.
 * It should be run in the browser console while the app is loaded.
 * 
 * Prerequisites:
 * - App running on localhost:5173
 * - Backend server running and accessible
 * - Two browser windows (regular + incognito) for real-time messaging tests
 * 
 * Usage:
 * 1. Open browser developer console (F12)
 * 2. Copy and paste this entire script
 * 3. Run: TestRunner.runAll()
 * 
 * Or run individual test suites:
 * - TestRunner.runAPITests()
 * - TestRunner.runAuthTests()
 * - TestRunner.runProfileTests()
 * - TestRunner.runContactTests()
 * - TestRunner.runMessageTests()
 */

const SERVER_URL = "https://pretorial-portliest-vertie.ngrok-free.dev";

// Test utilities
const TestUtils = {
  // Generate unique test email
  generateEmail: () => `test_${Date.now()}@example.com`,
  
  // Generate random string
  randomString: (length = 8) => Math.random().toString(36).substring(2, 2 + length),
  
  // API request helper
  async api(endpoint, options = {}) {
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
    
    return { ok: res.ok, status: res.status, data };
  },
  
  // Logging helpers
  log: (msg) => console.log(`[TEST] ${msg}`),
  pass: (msg) => console.log(`%c[PASS] ${msg}`, "color: green; font-weight: bold"),
  fail: (msg) => console.log(`%c[FAIL] ${msg}`, "color: red; font-weight: bold"),
  info: (msg) => console.log(`%c[INFO] ${msg}`, "color: blue"),
  
  // Delay helper
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Assert helpers
  assert(condition, message) {
    if (condition) {
      this.pass(message);
      return true;
    } else {
      this.fail(message);
      return false;
    }
  },
  
  assertEqual(actual, expected, message) {
    if (actual === expected) {
      this.pass(`${message} (got: ${actual})`);
      return true;
    } else {
      this.fail(`${message} - Expected: ${expected}, Got: ${actual}`);
      return false;
    }
  },
  
  assertExists(value, message) {
    if (value !== null && value !== undefined) {
      this.pass(message);
      return true;
    } else {
      this.fail(`${message} - Value is null or undefined`);
      return false;
    }
  }
};

// Test Results Tracker
const TestResults = {
  passed: 0,
  failed: 0,
  total: 0,
  
  reset() {
    this.passed = 0;
    this.failed = 0;
    this.total = 0;
  },
  
  record(success) {
    this.total++;
    if (success) {
      this.passed++;
    } else {
      this.failed++;
    }
  },
  
  summary() {
    console.log("\n========================================");
    console.log("TEST SUMMARY");
    console.log("========================================");
    console.log(`Total:  ${this.total}`);
    console.log(`%cPassed: ${this.passed}`, "color: green");
    console.log(`%cFailed: ${this.failed}`, "color: red");
    console.log(`Pass Rate: ${((this.passed / this.total) * 100).toFixed(1)}%`);
    console.log("========================================\n");
  }
};

// API Connection Tests
const APITests = {
  name: "API Connection Tests",
  
  async run() {
    console.log("\n--- API Connection Tests ---\n");
    
    // Test 1: Server is reachable
    try {
      const res = await fetch(SERVER_URL, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      TestResults.record(TestUtils.assert(res.ok || res.status === 404, "Server is reachable"));
    } catch (e) {
      TestResults.record(TestUtils.fail("Server is not reachable: " + e.message));
    }
    
    // Test 2: API endpoint responds
    const { status } = await TestUtils.api("/api/auth/userinfo");
    TestResults.record(TestUtils.assert(
      status === 200 || status === 404,
      "Auth endpoint responds"
    ));
    
    // Test 3: CORS headers work
    try {
      const res = await TestUtils.api("/api/auth/userinfo");
      TestResults.record(TestUtils.assert(
        res.status !== 0,
        "CORS configured correctly"
      ));
    } catch (e) {
      TestResults.record(TestUtils.fail("CORS error: " + e.message));
    }
  }
};

// Authentication Tests
const AuthTests = {
  name: "Authentication Tests",
  testEmail: null,
  testPassword: "testpass123",
  
  async run() {
    console.log("\n--- Authentication Tests ---\n");
    
    this.testEmail = TestUtils.generateEmail();
    
    // Test 1: Signup with valid credentials
    const signupRes = await TestUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: this.testEmail,
        password: this.testPassword
      })
    });
    TestResults.record(TestUtils.assertEqual(signupRes.status, 201, "Signup returns 201"));
    TestResults.record(TestUtils.assertExists(signupRes.data.user, "Signup returns user object"));
    TestResults.record(TestUtils.assertExists(signupRes.data.user?.id, "User has ID"));
    TestResults.record(TestUtils.assertEqual(
      signupRes.data.user?.profileSetup,
      false,
      "New user profileSetup is false"
    ));
    
    // Test 2: Signup with duplicate email
    const dupRes = await TestUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email: this.testEmail,
        password: this.testPassword
      })
    });
    TestResults.record(TestUtils.assertEqual(dupRes.status, 409, "Duplicate email returns 409"));
    
    // Test 3: Signup with missing fields
    const missingRes = await TestUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com" })
    });
    TestResults.record(TestUtils.assertEqual(missingRes.status, 400, "Missing password returns 400"));
    
    // Test 4: Logout
    const logoutRes = await TestUtils.api("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({})
    });
    TestResults.record(TestUtils.assertEqual(logoutRes.status, 200, "Logout returns 200"));
    
    // Test 5: Login with valid credentials
    const loginRes = await TestUtils.api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: this.testEmail,
        password: this.testPassword
      })
    });
    TestResults.record(TestUtils.assertEqual(loginRes.status, 200, "Login returns 200"));
    TestResults.record(TestUtils.assertExists(loginRes.data.user, "Login returns user object"));
    
    // Test 6: Login with wrong password
    const wrongPassRes = await TestUtils.api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: this.testEmail,
        password: "wrongpassword"
      })
    });
    TestResults.record(TestUtils.assertEqual(wrongPassRes.status, 400, "Wrong password returns 400"));
    
    // Test 7: Login with non-existent email
    const noUserRes = await TestUtils.api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "password123"
      })
    });
    TestResults.record(TestUtils.assertEqual(noUserRes.status, 404, "Non-existent user returns 404"));
    
    // Test 8: Get user info when logged in
    await TestUtils.api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: this.testEmail,
        password: this.testPassword
      })
    });
    const userInfoRes = await TestUtils.api("/api/auth/userinfo");
    TestResults.record(TestUtils.assertEqual(userInfoRes.status, 200, "Userinfo returns 200 when logged in"));
    TestResults.record(TestUtils.assertExists(userInfoRes.data.id, "Userinfo contains user ID"));
  }
};

// Profile Tests
const ProfileTests = {
  name: "Profile Tests",
  
  async run() {
    console.log("\n--- Profile Tests ---\n");
    
    // Ensure logged in with a fresh account
    const email = TestUtils.generateEmail();
    await TestUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password: "testpass123" })
    });
    
    // Test 1: Update profile with valid data
    const updateRes = await TestUtils.api("/api/auth/update-profile", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Test",
        lastName: "User"
      })
    });
    TestResults.record(TestUtils.assertEqual(updateRes.status, 200, "Profile update returns 200"));
    TestResults.record(TestUtils.assertEqual(
      updateRes.data.profileSetup,
      true,
      "profileSetup is true after update"
    ));
    TestResults.record(TestUtils.assertEqual(
      updateRes.data.firstName,
      "Test",
      "firstName is set correctly"
    ));
    TestResults.record(TestUtils.assertEqual(
      updateRes.data.lastName,
      "User",
      "lastName is set correctly"
    ));
    
    // Test 2: Update profile with missing fields
    const email2 = TestUtils.generateEmail();
    await TestUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email: email2, password: "testpass123" })
    });
    const missingRes = await TestUtils.api("/api/auth/update-profile", {
      method: "POST",
      body: JSON.stringify({ firstName: "Test" })
    });
    TestResults.record(TestUtils.assertEqual(
      missingRes.status,
      400,
      "Missing lastName returns 400"
    ));
    
    // Test 3: Verify profile persists
    const verifyRes = await TestUtils.api("/api/auth/userinfo");
    TestResults.record(TestUtils.assertExists(
      verifyRes.data.firstName,
      "Profile data persists after update"
    ));
  }
};

// Contact Tests
const ContactTests = {
  name: "Contact Tests",
  
  async run() {
    console.log("\n--- Contact Tests ---\n");
    
    // Create and setup a test user
    const email = TestUtils.generateEmail();
    await TestUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password: "testpass123" })
    });
    await TestUtils.api("/api/auth/update-profile", {
      method: "POST",
      body: JSON.stringify({ firstName: "Contact", lastName: "Tester" })
    });
    
    // Test 1: Search contacts
    const searchRes = await TestUtils.api("/api/contacts/search", {
      method: "POST",
      body: JSON.stringify({ searchTerm: "test" })
    });
    TestResults.record(TestUtils.assertEqual(searchRes.status, 200, "Search returns 200"));
    TestResults.record(TestUtils.assert(
      Array.isArray(searchRes.data.contacts),
      "Search returns contacts array"
    ));
    
    // Test 2: Search with empty term
    const emptySearchRes = await TestUtils.api("/api/contacts/search", {
      method: "POST",
      body: JSON.stringify({ searchTerm: "" })
    });
    TestResults.record(TestUtils.assertEqual(
      emptySearchRes.status,
      400,
      "Empty search term returns 400"
    ));
    
    // Test 3: Get all contacts
    const allContactsRes = await TestUtils.api("/api/contacts/all-contacts");
    TestResults.record(TestUtils.assertEqual(
      allContactsRes.status,
      200,
      "All contacts returns 200"
    ));
    TestResults.record(TestUtils.assert(
      Array.isArray(allContactsRes.data.contacts),
      "All contacts returns array"
    ));
    
    // Test 4: Get contacts for list
    const listRes = await TestUtils.api("/api/contacts/get-contacts-for-list");
    TestResults.record(TestUtils.assertEqual(
      listRes.status,
      200,
      "Get contacts for list returns 200"
    ));
    TestResults.record(TestUtils.assert(
      Array.isArray(listRes.data.contacts),
      "Contacts list is array"
    ));
  }
};

// Message Tests
const MessageTests = {
  name: "Message Tests",
  
  async run() {
    console.log("\n--- Message Tests ---\n");
    
    // Create test user
    const email = TestUtils.generateEmail();
    await TestUtils.api("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password: "testpass123" })
    });
    await TestUtils.api("/api/auth/update-profile", {
      method: "POST",
      body: JSON.stringify({ firstName: "Message", lastName: "Tester" })
    });
    
    // Get another user to test messaging
    const allContactsRes = await TestUtils.api("/api/contacts/all-contacts");
    const contacts = allContactsRes.data.contacts || [];
    
    if (contacts.length === 0) {
      TestUtils.info("No other users available for message tests - skipping");
      return;
    }
    
    const otherUser = contacts[0];
    TestUtils.info(`Testing messages with user: ${otherUser.label}`);
    
    // Test 1: Get messages with valid contact
    const messagesRes = await TestUtils.api("/api/messages/get-messages", {
      method: "POST",
      body: JSON.stringify({ id: otherUser.value })
    });
    TestResults.record(TestUtils.assertEqual(
      messagesRes.status,
      200,
      "Get messages returns 200"
    ));
    TestResults.record(TestUtils.assert(
      Array.isArray(messagesRes.data.messages),
      "Messages is an array"
    ));
    
    // Test 2: Get messages with missing ID
    const noIdRes = await TestUtils.api("/api/messages/get-messages", {
      method: "POST",
      body: JSON.stringify({})
    });
    TestResults.record(TestUtils.assertEqual(
      noIdRes.status,
      400,
      "Missing contact ID returns 400"
    ));
  }
};

// Socket.IO Tests (manual verification required)
const SocketTests = {
  name: "Socket.IO Tests",
  
  async run() {
    console.log("\n--- Socket.IO Tests ---\n");
    
    TestUtils.info("Socket.IO tests require manual verification:");
    console.log("1. Open app in two browser windows (regular + incognito)");
    console.log("2. Log in as different users in each window");
    console.log("3. Send a message from User A to User B");
    console.log("4. Verify message appears instantly in User B window");
    console.log("5. Send a message from User B to User A");
    console.log("6. Verify message appears instantly in User A window");
    console.log("");
    
    // Test socket connection
    if (typeof io !== "undefined") {
      TestUtils.info("Socket.IO client library is loaded");
      
      const userInfoRes = await TestUtils.api("/api/auth/userinfo");
      if (userInfoRes.ok && userInfoRes.data.id) {
        const socket = io(SERVER_URL, {
          withCredentials: true,
          extraHeaders: { "ngrok-skip-browser-warning": "true" },
          query: { userId: userInfoRes.data.id }
        });
        
        socket.on("connect", () => {
          TestResults.record(TestUtils.pass("Socket connected successfully"));
          socket.disconnect();
        });
        
        socket.on("connect_error", (error) => {
          TestResults.record(TestUtils.fail("Socket connection error: " + error.message));
        });
        
        // Wait for connection attempt
        await TestUtils.delay(3000);
      } else {
        TestUtils.info("Not logged in - skipping socket connection test");
      }
    } else {
      TestUtils.info("Socket.IO client not loaded - skipping socket tests");
    }
  }
};

// UI Tests (manual verification)
const UITests = {
  name: "UI Tests",
  
  run() {
    console.log("\n--- UI Tests (Manual Verification) ---\n");
    
    console.log("Verify the following UI elements and behaviors:");
    console.log("");
    console.log("Authentication Screen:");
    console.log("[ ] Login form displays email and password fields");
    console.log("[ ] Signup form displays email and password fields");
    console.log("[ ] Switch between login/signup works");
    console.log("[ ] Error messages display for invalid input");
    console.log("[ ] Loading state shows on button during submission");
    console.log("");
    console.log("Profile Setup Screen:");
    console.log("[ ] First name and last name fields display");
    console.log("[ ] User email is shown");
    console.log("[ ] Error message shows for empty fields");
    console.log("[ ] Redirects to chat after completion");
    console.log("");
    console.log("Chat Screen:");
    console.log("[ ] User name and email display in sidebar header");
    console.log("[ ] Logout button works");
    console.log("[ ] New Chat button opens search");
    console.log("[ ] Search input accepts text");
    console.log("[ ] Search results display");
    console.log("[ ] Clicking search result starts conversation");
    console.log("[ ] Conversations list displays");
    console.log("[ ] Selecting conversation loads messages");
    console.log("[ ] Selected conversation is highlighted");
    console.log("[ ] Delete button appears on conversations");
    console.log("[ ] Delete confirmation dialog appears");
    console.log("[ ] Message input field works");
    console.log("[ ] Send button is disabled when input is empty");
    console.log("[ ] Sent messages appear immediately");
    console.log("[ ] Messages auto-scroll to bottom");
    console.log("[ ] Own messages appear on right side");
    console.log("[ ] Other messages appear on left side");
    console.log("[ ] Timestamps display on messages");
    console.log("[ ] Delete Chat button in header works");
  }
};

// Main Test Runner
const TestRunner = {
  async runAll() {
    console.clear();
    console.log("========================================");
    console.log("MESSENGER APP SYSTEM TESTS");
    console.log("========================================");
    console.log("Starting test run at: " + new Date().toISOString());
    console.log("");
    
    TestResults.reset();
    
    await APITests.run();
    await AuthTests.run();
    await ProfileTests.run();
    await ContactTests.run();
    await MessageTests.run();
    await SocketTests.run();
    UITests.run();
    
    TestResults.summary();
  },
  
  async runAPITests() {
    TestResults.reset();
    await APITests.run();
    TestResults.summary();
  },
  
  async runAuthTests() {
    TestResults.reset();
    await AuthTests.run();
    TestResults.summary();
  },
  
  async runProfileTests() {
    TestResults.reset();
    await ProfileTests.run();
    TestResults.summary();
  },
  
  async runContactTests() {
    TestResults.reset();
    await ContactTests.run();
    TestResults.summary();
  },
  
  async runMessageTests() {
    TestResults.reset();
    await MessageTests.run();
    TestResults.summary();
  },
  
  async runSocketTests() {
    TestResults.reset();
    await SocketTests.run();
    TestResults.summary();
  },
  
  runUITests() {
    UITests.run();
  }
};

// Instructions
console.log("========================================");
console.log("MESSENGER APP TEST SCRIPT LOADED");
console.log("========================================");
console.log("");
console.log("Available commands:");
console.log("  TestRunner.runAll()         - Run all tests");
console.log("  TestRunner.runAPITests()    - Run API connection tests");
console.log("  TestRunner.runAuthTests()   - Run authentication tests");
console.log("  TestRunner.runProfileTests() - Run profile tests");
console.log("  TestRunner.runContactTests() - Run contact tests");
console.log("  TestRunner.runMessageTests() - Run message tests");
console.log("  TestRunner.runSocketTests()  - Run socket tests");
console.log("  TestRunner.runUITests()      - Show UI test checklist");
console.log("");
console.log("Run TestRunner.runAll() to start all tests.");
console.log("========================================");
