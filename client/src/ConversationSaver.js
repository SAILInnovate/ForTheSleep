// ConversationSaver.js

import React from 'react';
import './ConversationSaver.css'; // Ensure this file exists and matches your app's styling
import { db } from './firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const ConversationSaver = ({ messages, onSave, user }) => { // Receive 'user' as a prop
  const saveConversation = async () => {
    console.log("ConversationSaver - user:", user);
    if (!user) {
      alert('Please log in to save conversations.');
      return;
    }

    const conversation = {
      userId: user.uid,
      messages: messages,
      timestamp: serverTimestamp(),
    };
    
    try {
      const docRef = await addDoc(collection(db, "savedConversations"), conversation);
      console.log("Saved conversation to savedConversations with ID:", docRef.id);
      if (onSave) {
        onSave(conversation);
      }
      alert('Conversation saved successfully!');
    } catch (error) {
      console.error("Error saving conversation:", error);
      alert('Failed to save conversation. Please try again.');
    }
  };

  return (
    <button onClick={saveConversation} className="save-conversation-btn">
      Save Conversation
    </button>
  );
};

export default ConversationSaver;
