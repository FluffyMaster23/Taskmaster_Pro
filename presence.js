/**
 * User Presence Tracking
 * Tracks when users are online/offline in Firestore
 */

// Set user presence
function setUserPresence(user, online) {
  if (!user || !db) return;
  
  const presenceRef = db.collection('presence').doc(user.uid);
  
  if (online) {
    // Set user as online
    presenceRef.set({
      online: true,
      username: user.displayName || user.email.split('@')[0],
      email: user.email,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => console.error('Error setting presence:', error));
    
    // Set up offline detection when page closes
    window.addEventListener('beforeunload', () => {
      // Use navigator.sendBeacon for more reliable offline status
      const data = JSON.stringify({
        uid: user.uid,
        online: false,
        lastSeen: new Date().toISOString()
      });
      
      // Try to update via regular method
      presenceRef.update({
        online: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(() => {
        // Fallback - beacon request would need a server endpoint
      });
    });
    
    // Also handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        presenceRef.update({
          online: false,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => console.error('Error updating presence:', error));
      } else {
        presenceRef.update({
          online: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(error => console.error('Error updating presence:', error));
      }
    });
  } else {
    // Set user as offline
    presenceRef.update({
      online: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => console.error('Error updating presence:', error));
  }
}

// Clean up presence on sign out
function cleanupPresence(user) {
  if (user && db) {
    setUserPresence(user, false);
  }
}
