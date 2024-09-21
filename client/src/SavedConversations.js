// SavedConversations.js

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import './SavedConversations.css'; // Ensure this file exists and matches your app's styling

const SavedConversations = ({ user, setMessages, setActiveConversation }) => {
  const [savedConversations, setSavedConversations] = useState([]);

  useEffect(() => {
    const fetchSavedConversations = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, "savedConversations"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        const querySnapshot = await getDocs(q);
        const loadedSavedConversations = [];
        querySnapshot.forEach((docSnap) => {
          loadedSavedConversations.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("Loaded saved conversations:", loadedSavedConversations);
        setSavedConversations(loadedSavedConversations);
      } catch (error) {
        console.error("Error fetching saved conversations:", error);
      }
    };

    fetchSavedConversations();
  }, [user]);

  const deleteSavedConversation = async (id) => {
    try {
      await deleteDoc(doc(db, "savedConversations", id));
      setSavedConversations(savedConversations.filter(conv => conv.id !== id));
      console.log("Deleted saved conversation:", id);
    } catch (error) {
      console.error("Error deleting saved conversation:", error);
    }
  };

  const loadSavedConversation = (conv) => {
    setMessages(conv.messages);
    setActiveConversation(conv.id);
    console.log("Loaded saved conversation:", conv.id);
  };

  return (
    <div className="saved-conversations">
      <h3>Saved Conversations</h3>
      {savedConversations.length === 0 ? (
        <p>No saved conversations.</p>
      ) : (
        savedConversations.map((conv) => (
          <div 
            key={conv.id} 
            className="saved-conversation"
            onClick={() => loadSavedConversation(conv)}
          >
            <span>{conv.messages[0]?.content.substring(0, 30)}...</span>
            <button 
              className="delete-saved-conversation-btn"
              onClick={(e) => { e.stopPropagation(); deleteSavedConversation(conv.id); }}
            >
              ×
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default SavedConversations;
