// Debug script to run in browser console
// Copy and paste this into your browser's developer console (F12 -> Console) on localhost:3000

console.log('🔍 Debugging Pagination Issue...');

// Check all elements that might contain "19" or "pages" text
const allElements = document.querySelectorAll('*');
const elementsWithNumbers = [];

allElements.forEach(el => {
  const text = el.textContent || '';
  if (text.includes('19') || text.toLowerCase().includes('pages') || /\d+\s*of\s*\d+/.test(text)) {
    elementsWithNumbers.push({
      element: el,
      text: text.trim(),
      tagName: el.tagName,
      className: el.className
    });
  }
});

console.log('📊 Elements with pagination-related text:', elementsWithNumbers);

// Check React state if available
if (window.React) {
  try {
    // Look for React Fiber nodes
    const reactFiber = document.querySelector('#__next')?._reactInternals;
    console.log('⚛️  React fiber found:', !!reactFiber);
  } catch (e) {
    console.log('⚛️  React inspection failed:', e.message);
  }
}

// Check profiles array length
const profilesElements = document.querySelectorAll("[class*='profile'], [data-profile]");
console.log('👥 Profile elements found:', profilesElements.length);

// Check pagination display specifically
const paginationText = document.querySelector('span:has-text("of")') || 
                      Array.from(document.querySelectorAll('span')).find(el => /\d+\s*of\s*\d+/.test(el.textContent));
if (paginationText) {
  console.log('📄 Pagination text element:', paginationText.textContent);
  console.log('📄 Pagination element:', paginationText);
}

// Manual check for "19 pages" text
const allTextNodes = [];
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
  null,
  false
);

let node;
while (node = walker.nextNode()) {
  const text = node.textContent.trim();
  if (text.includes('19') || text.toLowerCase().includes('pages')) {
    allTextNodes.push({
      text: text,
      parent: node.parentElement?.tagName,
      parentClass: node.parentElement?.className
    });
  }
}

console.log('📝 Text nodes with "19" or "pages":', allTextNodes);

// Check for any global variables that might hold technician data
console.log('🌐 Global variables check:');
console.log('- window.profiles:', window.profiles?.length || 'undefined');
console.log('- localStorage technicians:', JSON.parse(localStorage.getItem('technicians') || 'null')?.length || 'none');
