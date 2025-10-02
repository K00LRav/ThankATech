// Clear Cache and Debug Pagination Issues
// Run this script in your browser console on thankatech.com

console.log('🧹 Clearing Cache and Debugging Pagination...');

// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear service worker cache if available
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister();
    });
  });
}

// Force clear browser cache (requires user action)
console.log('💡 To fully clear cache:');
console.log('1. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh');
console.log('2. Or press F12 → Network tab → check "Disable cache" → refresh');
console.log('3. Or use Ctrl+Shift+Delete to clear browser data');

// Check current pagination display
setTimeout(() => {
  console.log('🔍 Current pagination elements:');
  
  // Find all text that contains numbers and "of" or "page"
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const paginationTexts = [];
  let node;
  while (node = walker.nextNode()) {
    const text = node.textContent.trim();
    if (/\d+\s*(of|page|pages|total)/i.test(text) && text.length < 50) {
      paginationTexts.push({
        text: text,
        element: node.parentElement,
        tagName: node.parentElement?.tagName,
        className: node.parentElement?.className
      });
    }
  }

  console.log('📄 Found pagination texts:', paginationTexts);
  
  // Highlight them on the page
  paginationTexts.forEach((item, index) => {
    if (item.element) {
      item.element.style.border = '2px solid red';
      item.element.style.backgroundColor = 'yellow';
      item.element.title = `Pagination text ${index + 1}: "${item.text}"`;
    }
  });

  console.log('✨ Pagination elements are now highlighted in yellow with red borders!');
  
}, 1000);

console.log('🔄 Page will reload in 3 seconds to apply cache clearing...');
setTimeout(() => {
  window.location.reload(true);
}, 3000);