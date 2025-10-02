// Clear Browser Cache and Firebase Auth
// Run this in your browser's Developer Console (F12 -> Console tab)

console.log('🧹 Clearing all browser storage and Firebase auth...');

// Clear localStorage
localStorage.clear();
console.log('✅ localStorage cleared');

// Clear sessionStorage  
sessionStorage.clear();
console.log('✅ sessionStorage cleared');

// Clear IndexedDB (Firebase uses this for persistence)
if ('indexedDB' in window) {
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      if (db.name && db.name.includes('firebase')) {
        indexedDB.deleteDatabase(db.name);
        console.log(`✅ Deleted Firebase IndexedDB: ${db.name}`);
      }
    });
  });
}

// Clear cookies for the current domain
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('✅ Cookies cleared');

console.log('🎉 Browser storage cleared! Refresh the page.');
console.log('If still logged in, try hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');