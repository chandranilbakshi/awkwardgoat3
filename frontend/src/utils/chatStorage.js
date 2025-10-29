/**
 * Utility for managing chat messages in local storage
 * Each conversation is stored separately by conversation key
 */

const STORAGE_PREFIX = "chat_messages_";
const CHAT_METADATA_KEY = "chat_metadata";

/**
 * Generate a consistent conversation key from two user IDs
 * Ensures the same key regardless of order
 */
export function getConversationKey(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `${STORAGE_PREFIX}${sortedIds[0]}_${sortedIds[1]}`;
}

/**
 * Save messages for a specific conversation
 */
export function saveMessages(userId1, userId2, messages) {
  try {
    const key = getConversationKey(userId1, userId2);
    localStorage.setItem(key, JSON.stringify(messages));
    
    // Update metadata to track which conversations have local data
    updateChatMetadata(key);
    
    return true;
  } catch (error) {
    console.error("Error saving messages to local storage:", error);
    return false;
  }
}

/**
 * Load messages for a specific conversation
 */
export function loadMessages(userId1, userId2) {
  try {
    const key = getConversationKey(userId1, userId2);
    const data = localStorage.getItem(key);
    
    if (!data) {
      return null;
    }
    
    const messages = JSON.parse(data);
    
    // Convert timestamp strings back to Date objects
    return messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error("Error loading messages from local storage:", error);
    return null;
  }
}

/**
 * Check if local messages exist for a conversation
 */
export function hasLocalMessages(userId1, userId2) {
  const key = getConversationKey(userId1, userId2);
  return localStorage.getItem(key) !== null;
}

/**
 * Clear messages for a specific conversation
 */
export function clearConversation(userId1, userId2) {
  try {
    const key = getConversationKey(userId1, userId2);
    localStorage.removeItem(key);
    removeChatMetadata(key);
    return true;
  } catch (error) {
    console.error("Error clearing conversation:", error);
    return false;
  }
}

/**
 * Clear all chat messages (called on logout)
 */
export function clearAllChats() {
  try {
    const metadata = getChatMetadata();
    
    // Remove all conversation data
    metadata.conversations.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear metadata
    localStorage.removeItem(CHAT_METADATA_KEY);
    
    console.log("All chat data cleared from local storage");
    return true;
  } catch (error) {
    console.error("Error clearing all chats:", error);
    return false;
  }
}

/**
 * Get metadata about stored conversations
 */
function getChatMetadata() {
  try {
    const data = localStorage.getItem(CHAT_METADATA_KEY);
    if (!data) {
      return { conversations: [] };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading chat metadata:", error);
    return { conversations: [] };
  }
}

/**
 * Update metadata when a conversation is saved
 */
function updateChatMetadata(conversationKey) {
  try {
    const metadata = getChatMetadata();
    
    if (!metadata.conversations.includes(conversationKey)) {
      metadata.conversations.push(conversationKey);
      localStorage.setItem(CHAT_METADATA_KEY, JSON.stringify(metadata));
    }
  } catch (error) {
    console.error("Error updating chat metadata:", error);
  }
}

/**
 * Remove conversation from metadata
 */
function removeChatMetadata(conversationKey) {
  try {
    const metadata = getChatMetadata();
    metadata.conversations = metadata.conversations.filter(
      key => key !== conversationKey
    );
    localStorage.setItem(CHAT_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error("Error removing chat metadata:", error);
  }
}
