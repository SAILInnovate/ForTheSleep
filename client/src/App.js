// App.js

import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  setDoc,
  doc,
  query, 
  where, 
  getDocs, 
  getDoc,
  orderBy, 
  updateDoc,
  arrayUnion,
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import ForTheSheepAvatar from './ForTheSheepAvatar';
import BackgroundAnimation from './BackgroundAnimation';
import ConversationSaver from './ConversationSaver'; // Import the ConversationSaver component
import SavedConversations from './SavedConversations'; // Import the SavedConversations component

function App() {
  // State variables
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [messages, setMessages] = useState([]); // Current conversation messages
  const [input, setInput] = useState(''); // User input
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [conversations, setConversations] = useState([]); // List of conversations
  const [activeConversation, setActiveConversation] = useState(null); // Currently active conversation
  const messagesEndRef = useRef(null); // Reference to scroll to bottom

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed. Current user:", currentUser);
      setUser(currentUser);
      if (currentUser) {
        loadUserConversations(currentUser.uid);
        fetchUserData(currentUser.uid);
      } else {
        setFirstName('');
        setConversations([]);
        setMessages([]);
        setActiveConversation(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load user's conversations from Firestore
  const loadUserConversations = async (userId) => {
    try {
      const q = query(
        collection(db, "conversations"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
      );
      const querySnapshot = await getDocs(q);
      const loadedConversations = [];
      querySnapshot.forEach((docSnap) => {
        loadedConversations.push({ id: docSnap.id, ...docSnap.data() });
      });
      console.log("Loaded conversations:", loadedConversations);
      setConversations(loadedConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  // Fetch user's first name from Firestore
  const fetchUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("Fetched user data:", userData);
        setFirstName(userData.firstName);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Handle user authentication (login/signup)
  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), { // Use setDoc with user.uid as the document ID
          firstName: firstName,
          email: email
        });
        console.log("User signed up and data saved.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("User signed in.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      alert(error.message);
    }
    setIsLoading(false);
  };

  // Handle user logout
  const handleLogout = () => {
    signOut(auth).then(() => {
      console.log("User logged out.");
      setUser(null);
      setConversations([]);
      setMessages([]);
      setActiveConversation(null);
      setFirstName('');
    }).catch((error) => {
      console.error("Logout error:", error);
    });
  };

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let conversationRef;
      if (activeConversation) {
        conversationRef = doc(db, "conversations", activeConversation);
        // Update Firestore with the user's message
        await updateDoc(conversationRef, {
          messages: arrayUnion(userMessage),
          timestamp: serverTimestamp()
        });
        console.log("Updated existing conversation:", activeConversation);
      } else {
        // Create a new conversation with the user's message
        const newConversation = await addDoc(collection(db, "conversations"), {
          userId: user.uid,
          timestamp: serverTimestamp(),
          messages: [userMessage]
        });
        conversationRef = newConversation;
        setActiveConversation(newConversation.id);
        console.log("Created new conversation:", newConversation.id);
      }

      // Fetch AI response from server.js
      const response = await fetch('/api/chat', { // Ensure your server is correctly handling this endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("AI response:", data.reply);
      const aiMessage = { role: 'assistant', content: data.reply };

      // Update Firestore with the AI's message
      await updateDoc(conversationRef, {
        messages: arrayUnion(aiMessage),
        timestamp: serverTimestamp()
      });

      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      loadUserConversations(user.uid);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: 'An error occurred. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new chat
  const startNewChat = () => {
    setMessages([]);
    setActiveConversation(null);
  };

  // Load a specific conversation
  const loadConversation = async (id) => {
    try {
      const conversationRef = doc(db, "conversations", id);
      const conversationSnap = await getDoc(conversationRef);
      if (conversationSnap.exists()) {
        const conversationData = conversationSnap.data();
        setMessages(conversationData.messages);
        setActiveConversation(id);
        console.log("Loaded conversation:", id);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  // Delete a conversation
  const deleteConversation = async (id, e) => {
    e.stopPropagation(); // Prevent triggering the loadConversation
    try {
      await deleteDoc(doc(db, "conversations", id));
      setConversations(conversations.filter(conv => conv.id !== id));
      console.log("Deleted conversation:", id);
      if (activeConversation === id) {
        startNewChat();
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  // Handle post-save actions (e.g., notifications)
  const handleSaveConversation = () => {
    // This can be expanded to handle more complex actions
    // Currently, the ConversationSaver handles the alert
  };

  // Render authentication form if not logged in
  if (!user) {
    return (
      <div className="App">
        <BackgroundAnimation />
        <div className="auth-container">
          <ForTheSheepAvatar isLoading={false} />
          <h2>{authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
          <form onSubmit={handleAuth}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            {authMode === 'signup' && (
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                required
              />
            )}
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Loading...' : (authMode === 'login' ? 'Login' : 'Sign Up')}
            </button>
          </form>
          <p>
            {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
              {authMode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Render main chat interface if logged in
  return (
    <div className="App">
      <BackgroundAnimation />
      <header className="App-header">
        <ForTheSheepAvatar isLoading={isLoading} />
        <div className="user-info">
          <span>Welcome, {firstName}</span> {/* Personalized Welcome Message */}
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>
      <main className="main-content">
        <div className="sidebar">
          <button onClick={startNewChat} className="new-chat-btn">New Chat</button>
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              className={`conversation-tab ${activeConversation === conv.id ? 'active' : ''}`}
              onClick={() => loadConversation(conv.id)}
            >
              <span>{conv.messages[0]?.content.substring(0, 30)}...</span>
              <button 
                className="delete-chat-btn"
                onClick={(e) => deleteConversation(conv.id, e)}
              >
                ×
              </button>
            </div>
          ))}
          {/* Add the SavedConversations component */}
          <SavedConversations 
            user={user} 
            setMessages={setMessages} 
            setActiveConversation={setActiveConversation} 
          />
        </div>
        <div className="chat-container">
          <div className="messages-wrapper">
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  {message.content}
                </div>
              ))}
              {isLoading && (
                <div className="message assistant loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          <form onSubmit={handleSubmit} className="input-form">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Seek wisdom..."
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading} className="ask-btn">Ask</button>
            {/* Integrate ConversationSaver */}
            <ConversationSaver 
              messages={messages} 
              onSave={handleSaveConversation} 
              user={user} 
            />
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
