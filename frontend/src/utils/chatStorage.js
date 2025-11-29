/**
 * Utility for managing chat messages in local storage
 * Each conversation is stored separately by conversation key
 * Includes sync metadata for efficient incremental updates
 */

const STORAGE_PREFIX = "chat_messages_";
const CHAT_METADATA_KEY = "chat_metadata";
const SYNC_METADATA_SUFFIX = "_sync";

/**
 * Generate a consistent conversation key from two user IDs
 * Ensures the same key regardless of order
 */
export function getConversationKey(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `${STORAGE_PREFIX}${sortedIds[0]}_${sortedIds[1]}`;
}

/**
 * Generate sync metadata key for a conversation
 */
function getSyncMetadataKey(conversationKey) {
  return `${conversationKey}${SYNC_METADATA_SUFFIX}`;
}

/**
 * Save messages for a specific conversation
 * Also updates the last sync timestamp
 */
export function saveMessages(userId1, userId2, messages, updateSyncTime = true) {
  try {
    const key = getConversationKey(userId1, userId2);
    localStorage.setItem(key, JSON.stringify(messages));
    
    // Update sync metadata
    if (updateSyncTime) {
      updateLastSyncTime(userId1, userId2);
    }
    
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
 * Get the last sync timestamp for a conversation
 * Returns null if never synced
 */
export function getLastSyncTime(userId1, userId2) {
  try {
    const key = getConversationKey(userId1, userId2);
    const syncKey = getSyncMetadataKey(key);
    const syncData = localStorage.getItem(syncKey);
    
    if (!syncData) {
      return null;
    }
    
    const { lastSynced } = JSON.parse(syncData);
    return lastSynced ? new Date(lastSynced) : null;
  } catch (error) {
    console.error("Error getting last sync time:", error);
    return null;
  }
}

/**
 * Update the last sync timestamp for a conversation
 */
export function updateLastSyncTime(userId1, userId2, timestamp = new Date()) {
  try {
    const key = getConversationKey(userId1, userId2);
    const syncKey = getSyncMetadataKey(key);
    
    const syncData = {
      lastSynced: timestamp.toISOString(),
      conversationKey: key,
    };
    
    localStorage.setItem(syncKey, JSON.stringify(syncData));
    return true;
  } catch (error) {
    console.error("Error updating last sync time:", error);
    return false;
  }
}

/**
 * Merge new messages with existing messages
 * Removes duplicates based on message ID and sorts by timestamp
 * Optimized to handle large message sets efficiently
 */
export function mergeMessages(existingMessages, newMessages) {
  // Fast path: if no existing messages, just sort new messages
  if (!existingMessages || existingMessages.length === 0) {
    const sorted = [...newMessages];
    sorted.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return timeA - timeB;
    });
    return sorted;
  }

  // Fast path: if no new messages, return existing
  if (!newMessages || newMessages.length === 0) {
    return existingMessages;
  }

  // Create a map to track unique messages by ID
  const messageMap = new Map();
  
  // Add existing messages
  for (let i = 0; i < existingMessages.length; i++) {
    messageMap.set(existingMessages[i].id, existingMessages[i]);
  }
  
  // Add/update with new messages
  for (let i = 0; i < newMessages.length; i++) {
    messageMap.set(newMessages[i].id, newMessages[i]);
  }
  
  // Convert back to array and sort by timestamp
  const merged = Array.from(messageMap.values());
  merged.sort((a, b) => {
    const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
    const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
    return timeA - timeB;
  });
  
  return merged;
}

/**
 * Clear messages for a specific conversation
 */
export function clearConversation(userId1, userId2) {
  try {
    const key = getConversationKey(userId1, userId2);
    const syncKey = getSyncMetadataKey(key);
    
    localStorage.removeItem(key);
    localStorage.removeItem(syncKey);
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
    
    // Remove all conversation data and sync metadata
    metadata.conversations.forEach(key => {
      localStorage.removeItem(key);
      localStorage.removeItem(getSyncMetadataKey(key));
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
